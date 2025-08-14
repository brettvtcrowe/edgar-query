# Domain Adapters - SEC Forms & Accounting Expertise

## Overview

Domain adapters provide specialized parsing, extraction, and analysis capabilities for different SEC filing types and accounting topics. Each adapter incorporates deep domain knowledge to extract structured information and identify relevant patterns.

## 🏛️ SEC Form-Specific Adapters

### 10-K Annual Reports
**Purpose**: Comprehensive annual business and financial disclosure

#### Section Mapping
```typescript
interface Form10KSections {
  "Item_1": {
    label: "Business";
    description: "Business overview, products, services, strategy";
    keyTopics: ["revenue_streams", "business_model", "competition", "segments"];
  };
  "Item_1A": {
    label: "Risk Factors";
    description: "Material risks that could affect business";
    keyTopics: ["operational_risk", "financial_risk", "regulatory_risk", "cyber_risk"];
  };
  "Item_7": {
    label: "MD&A";
    description: "Management's discussion and analysis";
    keyTopics: ["financial_performance", "liquidity", "capital_resources", "outlook"];
  };
  "Item_7A": {
    label: "Market Risk";
    description: "Quantitative and qualitative market risk disclosures";
    keyTopics: ["interest_rate_risk", "foreign_currency", "commodity_risk"];
  };
  "Item_8": {
    label: "Financial Statements";
    description: "Audited financial statements and notes";
    keyTopics: ["income_statement", "balance_sheet", "cash_flow", "accounting_policies"];
  };
}
```

#### Extraction Patterns
```typescript
class Form10KAdapter {
  // Extract accounting policy changes
  async extractAccountingPolicyChanges(filing: Filing): Promise<PolicyChange[]> {
    const notePatterns = [
      /Note\s+\d+[\.:]?\s*Summary of Significant Accounting Policies/i,
      /Recently\s+Adopted\s+Accounting\s+Standards/i,
      /New\s+Accounting\s+Pronouncements/i
    ];
    
    // Implementation extracts policy changes with ASC references
  }
  
  // Identify segment reporting changes
  async extractSegmentChanges(filing: Filing): Promise<SegmentChange[]> {
    const segmentPatterns = [
      /reportable\s+segment/i,
      /operating\s+segment/i,
      /segment\s+information/i,
      /disaggregation\s+of\s+revenue/i
    ];
    
    // Implementation identifies segment structure changes
  }
}
```

### 8-K Current Reports
**Purpose**: Material events and corporate changes

#### Event Item Mapping
```typescript
interface Form8KItems {
  "2.01": {
    label: "Completion of Acquisition or Disposition";
    triggers: ["acquisition", "merger", "sale_of_assets"];
    followupAnalysis: ["segment_changes", "accounting_changes"];
  };
  "4.01": {
    label: "Changes in Accountant";
    triggers: ["auditor_change", "disagreement"];
    redFlags: ["accounting_dispute", "internal_control_issues"];
  };
  "4.02": {
    label: "Non-Reliance on Financial Statements";
    triggers: ["restatement", "material_weakness"];
    urgency: "HIGH";
    followupRequired: ["restatement_analysis", "internal_control_review"];
  };
  "5.02": {
    label: "Departure/Appointment of Officers";
    triggers: ["ceo_change", "cfo_change", "executive_departure"];
    contextualAnalysis: ["reason_for_departure", "succession_planning"];
  };
}
```

#### Restatement Detection
```typescript
class Restatement Detector {
  async analyzeRestatement(item402Filing: Filing): Promise<RestatementAnalysis> {
    return {
      restatedPeriods: this.extractRestatedPeriods(filing),
      accountingIssues: this.identifyAccountingIssues(filing),
      ascTopicsAffected: this.extractASCReferences(filing),
      materialityAssessment: this.assessMateriality(filing),
      managementActions: this.extractManagementResponse(filing)
    };
  }
  
  private extractASCReferences(filing: Filing): ASCTopic[] {
    // Pattern matching for ASC 606, 860, 842, etc.
    const ascPatterns = [
      /ASC\s+(\d{3})-?(\d{2})?/g,
      /Topic\s+(\d{3})/g,
      /revenue\s+recognition/i,
      /principal\s+vs\.?\s+agent/i,
      /failed\s+sale/i
    ];
    
    // Implementation extracts accounting standard references
  }
}
```

### SEC Comment Letters (UPLOAD/CORRESP)
**Purpose**: SEC review process correspondence

#### Thread Parsing
```typescript
class CommentLetterAdapter {
  async parseCommentThread(uploadFiling: Filing, correspFiling: Filing): Promise<CommentThread> {
    return {
      secQuestions: this.extractSECQuestions(uploadFiling),
      companyResponses: this.extractCompanyResponses(correspFiling),
      topics: this.identifyDiscussionTopics([uploadFiling, correspFiling]),
      resolution: this.assessResolutionStatus([uploadFiling, correspFiling]),
      followupRequired: this.identifyFollowupItems([uploadFiling, correspFiling])
    };
  }
  
  private identifyDiscussionTopics(filings: Filing[]): CommentTopic[] {
    const topicPatterns = {
      revenue_recognition: [
        /revenue\s+recognition/i,
        /ASC\s+606/i,
        /performance\s+obligation/i,
        /contract\s+modification/i
      ],
      internal_controls: [
        /internal\s+control/i,
        /material\s+weakness/i,
        /SOX\s+404/i,
        /deficiency/i
      ],
      segment_reporting: [
        /segment/i,
        /CODM/i,
        /chief\s+operating\s+decision\s+maker/i,
        /disaggregation/i
      ]
    };
    
    // Implementation identifies discussion themes
  }
}
```

## 🧮 Accounting Standards Expertise

### ASC Topic Library
```typescript
interface ASCTopicDefinition {
  code: string;
  title: string;
  keywords: string[];
  negativePatterns: string[];
  typicalSections: SectionType[];
  industrySpecific?: Industry[];
  commonIssues: string[];
}

const ASC_TOPICS: Record<string, ASCTopicDefinition> = {
  "ASC_606": {
    code: "ASC 606",
    title: "Revenue from Contracts with Customers",
    keywords: [
      "revenue recognition", "performance obligation", "contract modification",
      "principal vs agent", "variable consideration", "contract asset",
      "contract liability", "transaction price", "control transfer"
    ],
    negativePatterns: ["deferred revenue", "unearned revenue"],
    typicalSections: ["Item_8", "MD&A", "accounting_policies"],
    commonIssues: [
      "principal_vs_agent_determination",
      "variable_consideration_estimation", 
      "contract_modification_accounting",
      "series_guidance_application"
    ]
  },
  
  "ASC_860": {
    code: "ASC 860", 
    title: "Transfers and Servicing",
    keywords: [
      "failed sale", "factoring", "receivables transfer", "recourse",
      "continuing involvement", "servicing rights", "securitization"
    ],
    negativePatterns: ["sale of assets", "disposal"],
    typicalSections: ["Item_8", "accounting_policies", "notes_to_financials"],
    industrySpecific: ["financial_services", "healthcare", "retail"],
    commonIssues: [
      "failed_sale_accounting",
      "recourse_provision_impact",
      "continuing_involvement_assessment"
    ]
  }
};
```

### Revenue Recognition Patterns
```typescript
class RevenueRecognitionAnalyzer {
  async identifyRevenueModel(filing: Filing): Promise<RevenueModel> {
    const patterns = {
      milestone_method: [
        /milestone\s+method/i,
        /milestone\s+payment/i,
        /development\s+milestone/i,
        /regulatory\s+milestone/i
      ],
      percentage_completion: [
        /percentage\s+of\s+completion/i,
        /over\s+time/i,
        /input\s+method/i,
        /cost-to-cost/i
      ],
      point_in_time: [
        /point\s+in\s+time/i,
        /upon\s+delivery/i,
        /control\s+transfer/i,
        /customer\s+acceptance/i
      ]
    };
    
    // Implementation identifies revenue recognition methods
  }
  
  async detectPrincipalVsAgent(filing: Filing): Promise<PrincipalAgentAnalysis> {
    const indicators = {
      principal: [
        /primary\s+obligor/i,
        /inventory\s+risk/i,
        /pricing\s+discretion/i,
        /controls\s+goods\s+before/i
      ],
      agent: [
        /arranges\s+for\s+another/i,
        /commission/i,
        /fee\s+arrangement/i,
        /third.party\s+provider/i
      ]
    };
    
    // Implementation analyzes principal vs agent determination
  }
}
```

## 🏢 Industry-Specific Adapters

### Life Sciences Revenue Recognition
```typescript
class LifeSciencesAdapter {
  industryPatterns = {
    milestone_payments: [
      /development\s+milestone/i,
      /regulatory\s+approval/i,
      /FDA\s+approval/i,
      /clinical\s+trial/i,
      /commercialization\s+milestone/i
    ],
    licensing_arrangements: [
      /license\s+agreement/i,
      /royalty/i,
      /collaboration\s+agreement/i,
      /research\s+and\s+development/i
    ]
  };
  
  async analyzeMilestoneAccounting(filing: Filing): Promise<MilestoneAnalysis> {
    // Specialized analysis for life sciences milestone method
  }
}
```

### Financial Services Adapters
```typescript
class FinancialServicesAdapter {
  specializedPatterns = {
    credit_losses: [
      /allowance\s+for\s+credit\s+losses/i,
      /CECL/i,
      /current\s+expected\s+credit\s+losses/i,
      /provision\s+for\s+credit\s+losses/i
    ],
    fair_value_measurements: [
      /fair\s+value\s+measurement/i,
      /level\s+[123]\s+inputs/i,
      /mark-to-market/i,
      /ASC\s+820/i
    ]
  };
}
```

## 🔗 Event Correlation Engine

### Temporal Event Linking
```typescript
class EventCorrelationEngine {
  async linkAcquisitionToSegmentChanges(
    acquisitions: CorporateEvent[],
    segmentChanges: SegmentEvent[]
  ): Promise<EventCorrelation[]> {
    const correlations: EventCorrelation[] = [];
    
    for (const acquisition of acquisitions) {
      const relatedChanges = segmentChanges.filter(change => 
        this.isWithinTimeWindow(acquisition.date, change.date, "12_months") &&
        this.hasSimilarBusinessDescription(acquisition, change)
      );
      
      if (relatedChanges.length > 0) {
        correlations.push({
          primaryEvent: acquisition,
          relatedEvents: relatedChanges,
          confidence: this.calculateCorrelationConfidence(acquisition, relatedChanges),
          reasoning: this.generateCorrelationReasoning(acquisition, relatedChanges)
        });
      }
    }
    
    return correlations;
  }
}
```

## 📊 Pattern Recognition & Learning

### Continuous Improvement
- **Pattern refinement**: Update extraction patterns based on success rates
- **Industry evolution**: Adapt to new business models and accounting methods
- **Regulatory changes**: Incorporate new SEC rules and accounting standards
- **User feedback**: Learn from corrections and improve accuracy

### Quality Metrics
```typescript
interface AdapterMetrics {
  extractionAccuracy: number;    // % of correctly extracted information
  patternCoverage: number;       // % of relevant patterns identified
  falsePositiveRate: number;     // % of incorrectly identified patterns
  temporalAccuracy: number;      // % of correct temporal correlations
  userSatisfaction: number;      // User feedback scores
}
```

These domain adapters ensure that the EDGAR Answer Engine can provide sophisticated, accurate analysis across different SEC filing types and accounting domains, with the depth of knowledge expected by professional users.