import { EDGARClient } from '@edgar-query/edgar-client';
import { 
  BulkDiscoveryParams, 
  BulkDiscoveryParamsSchema,
  DiscoveredFiling,
  DiscoveredFilingSchema,
  ProgressUpdate,
  Industry
} from './types.js';

/**
 * Company to industry mappings for filtering
 * This would typically come from a database or external service
 */
const COMPANY_INDUSTRY_MAP: Record<string, Industry> = {
  // Technology
  'AAPL': 'technology',
  'MSFT': 'technology', 
  'GOOGL': 'technology',
  'GOOG': 'technology',
  'NVDA': 'technology',
  'META': 'technology',
  'TSLA': 'technology',
  'NFLX': 'technology',
  'ORCL': 'technology',
  'CRM': 'technology',
  
  // Financial
  'JPM': 'financial',
  'BAC': 'financial',
  'WFC': 'financial',
  'GS': 'financial',
  'MS': 'financial',
  'C': 'financial',
  
  // Healthcare
  'JNJ': 'healthcare',
  'PFE': 'healthcare',
  'UNH': 'healthcare',
  'ABBV': 'healthcare',
  'MRK': 'healthcare',
  
  // Energy
  'XOM': 'energy',
  'CVX': 'energy',
  'COP': 'energy'
};

/**
 * Major companies for industry-based discovery
 */
const INDUSTRY_COMPANIES: Record<Industry, string[]> = {
  'technology': ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA', 'NFLX', 'ORCL', 'CRM'],
  'financial': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C'],
  'healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK'],
  'energy': ['XOM', 'CVX', 'COP'],
  'consumer': [],
  'industrial': [],
  'materials': [],
  'utilities': [],
  'telecommunications': [],
  'real-estate': []
};

/**
 * Progress callback type for streaming updates
 */
export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * Bulk filing discovery across multiple companies
 * 
 * This function discovers SEC filings across companies based on criteria like:
 * - Form types (10-K, 10-Q, 8-K, etc.)
 * - Date ranges 
 * - Industry filters
 * - Specific company lists
 * 
 * @param params - Discovery parameters
 * @param edgarClient - EDGAR client instance
 * @param progressCallback - Optional progress reporting
 * @returns Array of discovered filings
 */
export async function bulkFilingDiscovery(
  params: BulkDiscoveryParams,
  edgarClient: EDGARClient,
  progressCallback?: ProgressCallback
): Promise<DiscoveredFiling[]> {
  // Validate and apply defaults
  const validatedParams = BulkDiscoveryParamsSchema.parse({
    formTypes: ['10-K', '10-Q', '8-K'],
    maxResults: 1000,
    sortBy: 'filed-date',
    sortOrder: 'desc',
    ...params
  });
  
  const startTime = Date.now();
  
  try {
    // Step 1: Determine target companies
    const targetCompanies = await determineTargetCompanies(validatedParams, progressCallback);
    
    if (targetCompanies.length === 0) {
      throw new Error('No companies found matching the specified criteria');
    }
    
    progressCallback?.({
      operation: 'discovery',
      completed: 0,
      total: targetCompanies.length,
      currentItem: 'Starting filing discovery...'
    });
    
    // Step 2: Discover filings for each company
    const allFilings: DiscoveredFiling[] = [];
    
    for (let i = 0; i < targetCompanies.length; i++) {
      const ticker = targetCompanies[i];
      
      progressCallback?.({
        operation: 'discovery',
        completed: i,
        total: targetCompanies.length,
        currentItem: `Discovering filings for ${ticker}`,
        estimatedTimeRemaining: estimateTimeRemaining(startTime, i, targetCompanies.length)
      });
      
      try {
        const companyFilings = await discoverCompanyFilings(
          ticker,
          validatedParams,
          edgarClient
        );
        
        allFilings.push(...companyFilings);
        
        // Rate limiting - small delay between companies
        if (i < targetCompanies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.warn(`Failed to discover filings for ${ticker}:`, error);
        // Continue with other companies
      }
    }
    
    // Step 3: Sort and filter results
    const sortedFilings = sortFilings(allFilings, validatedParams);
    const limitedFilings = sortedFilings.slice(0, validatedParams.maxResults);
    
    progressCallback?.({
      operation: 'discovery',
      completed: targetCompanies.length,
      total: targetCompanies.length,
      currentItem: `Discovery complete: ${limitedFilings.length} filings found`
    });
    
    return limitedFilings;
    
  } catch (error) {
    console.error('Bulk filing discovery failed:', error);
    throw new Error(`Filing discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Determine which companies to search based on parameters
 */
async function determineTargetCompanies(
  params: BulkDiscoveryParams,
  progressCallback?: ProgressCallback
): Promise<string[]> {
  
  // If specific companies provided, use those
  if (params.companies && params.companies.length > 0) {
    return params.companies;
  }
  
  // If industries specified, get companies from those industries  
  if (params.industries && params.industries.length > 0) {
    const companiesFromIndustries = params.industries.flatMap(
      industry => INDUSTRY_COMPANIES[industry] || []
    );
    
    return [...new Set(companiesFromIndustries)]; // Remove duplicates
  }
  
  // Default: major companies across all industries
  const allCompanies = Object.values(INDUSTRY_COMPANIES)
    .flatMap(companies => companies);
    
  return [...new Set(allCompanies)].slice(0, 20); // Limit to 20 companies for performance
}

/**
 * Discover filings for a single company
 */
async function discoverCompanyFilings(
  ticker: string,
  params: BulkDiscoveryParams,
  edgarClient: EDGARClient
): Promise<DiscoveredFiling[]> {
  
  try {
    // Get company CIK
    const cik = await edgarClient.getCIKByTicker(ticker);
    if (!cik) {
      throw new Error(`Could not resolve CIK for ticker ${ticker}`);
    }
    
    // Get company info for name
    const companyInfo = await edgarClient.getCompanyInfo(cik);
    const companyName = companyInfo ? companyInfo.name : ticker;
    
    // Get recent filings
    const filings = await edgarClient.getRecentFilings({
      identifier: cik,
      limit: 100, // Get more than we need, filter later
      form_type: (params.formTypes || ['10-K', '10-Q', '8-K']).join(',')
    });
    
    if (!filings || filings.length === 0) {
      return [];
    }
    
    const industry = COMPANY_INDUSTRY_MAP[ticker];
    
    // Convert to our format and apply date filtering
    const discoveredFilings: DiscoveredFiling[] = filings
      .filter(filing => {
        // Filter by date range if specified
        if (params.dateRange) {
          const filedDate = new Date(filing.filingDate);
          const startDate = new Date(params.dateRange.start);
          const endDate = new Date(params.dateRange.end);
          
          if (filedDate < startDate || filedDate > endDate) {
            return false;
          }
        }
        
        return true;
      })
      .map(filing => ({
        cik,
        companyName,
        ticker,
        accession: filing.accessionNumber,
        form: filing.form as any, // Type assertion - should be validated by form filter
        filedAt: filing.filingDate,
        primaryUrl: `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, '')}/${filing.accessionNumber.replace(/-/g, '')}/${filing.primaryDocument}`,
        size: filing.size,
        industry,
        hasContent: false, // Will be updated when content is fetched
        contentUrl: undefined,
        sectionCount: undefined
      }))
      .filter(Boolean);
      
    return discoveredFilings;
    
  } catch (error) {
    console.error(`Error discovering filings for ${ticker}:`, error);
    return [];
  }
}

/**
 * Sort filings based on parameters
 */
function sortFilings(filings: DiscoveredFiling[], params: BulkDiscoveryParams): DiscoveredFiling[] {
  const sorted = [...filings];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (params.sortBy) {
      case 'filed-date':
        comparison = new Date(a.filedAt).getTime() - new Date(b.filedAt).getTime();
        break;
        
      case 'company':
        comparison = a.companyName.localeCompare(b.companyName);
        break;
        
      case 'relevance':
        // For now, sort by date as proxy for relevance
        // In Phase 3, this would use actual relevance scoring
        comparison = new Date(a.filedAt).getTime() - new Date(b.filedAt).getTime();
        break;
        
      default:
        comparison = new Date(a.filedAt).getTime() - new Date(b.filedAt).getTime();
    }
    
    return params.sortOrder === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}

/**
 * Estimate time remaining for progress reporting
 */
function estimateTimeRemaining(startTime: number, completed: number, total: number): number | undefined {
  if (completed === 0) return undefined;
  
  const elapsed = Date.now() - startTime;
  const avgTimePerItem = elapsed / completed;
  const remaining = total - completed;
  
  return Math.round((avgTimePerItem * remaining) / 1000); // Convert to seconds
}