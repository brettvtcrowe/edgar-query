# EDGAR Answer Engine - UX/UI Design Specification

## Document Version
- **Version**: 1.0.0
- **Status**: Ready for Implementation
- **Design System**: EDGAR DS 1.0

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Visual Design System](#2-visual-design-system)
3. [Layout Architecture](#3-layout-architecture)
4. [Component Library](#4-component-library)
5. [Interaction Patterns](#5-interaction-patterns)
6. [Responsive Design](#6-responsive-design)
7. [Accessibility Standards](#7-accessibility-standards)
8. [Implementation Guidelines](#8-implementation-guidelines)
9. [Component Specifications](#9-component-specifications)
10. [State Management](#10-state-management)

---

## 1. Design Philosophy

### Core Principles
- **Financial Intelligence, Beautifully Simple**: Sophisticated data analysis with approachable interface
- **Trust Through Transparency**: Every data point visually connected to its source
- **Progressive Disclosure**: Complex features revealed as needed
- **Performance First**: Instant feedback and progressive loading

### Design Goals
1. **Reduce Cognitive Load**: Clear visual hierarchy and information architecture
2. **Build Trust**: Transparent sourcing and citation visibility
3. **Enable Flow**: Seamless query-to-insight workflow
4. **Ensure Accuracy**: Visual confirmation of data sources

---

## 2. Visual Design System

### 2.1 Color Palette

```scss
// Primary Colors
$primary-blue: #0066CC;      // Primary actions, links, focus states
$primary-blue-hover: #0052A3; // Hover state
$primary-blue-active: #004080; // Active/pressed state
$primary-blue-light: #E6F0FF; // Light background

// Semantic Colors
$sec-orange: #FF6B35;        // SEC branding, highlights
$success-green: #00A67E;     // Positive metrics, success states
$warning-amber: #F59E0B;     // Warnings, cautions
$error-red: #DC2626;         // Errors, negative metrics
$info-blue: #3B82F6;         // Informational messages

// Neutral Scale
$gray-950: #0A0F1C;          // Primary text
$gray-900: #111827;          // Headers
$gray-800: #1E293B;          // Secondary text
$gray-700: #374151;          // Tertiary text
$gray-600: #4B5563;          // Disabled text
$gray-500: #6B7280;          // Placeholders
$gray-400: #9CA3AF;          // Borders
$gray-300: #D1D5DB;          // Dividers
$gray-200: #E5E7EB;          // Light borders
$gray-100: #F1F5F9;          // Backgrounds
$gray-50: #F9FAFB;           // Light backgrounds
$white: #FFFFFF;             // Cards, surfaces

// Data Visualization
$chart-1: #0066CC;           // Primary data series
$chart-2: #00A67E;           // Secondary data series
$chart-3: #FF6B35;           // Tertiary data series
$chart-4: #8B5CF6;           // Quaternary data series
$chart-5: #EC4899;           // Quinary data series
```

### 2.2 Typography

```scss
// Font Families
$font-display: 'Inter Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
$font-body: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
$font-mono: 'JetBrains Mono', 'SF Mono', Monaco, monospace;

// Font Sizes
$text-xs: 0.75rem;      // 12px - Metadata, labels
$text-sm: 0.875rem;     // 14px - Secondary text, citations
$text-base: 1rem;       // 16px - Body text
$text-lg: 1.125rem;     // 18px - Subheaders
$text-xl: 1.25rem;      // 20px - Section headers
$text-2xl: 1.5rem;      // 24px - Page headers
$text-3xl: 1.875rem;    // 30px - Large headers
$text-4xl: 2.25rem;     // 36px - Hero text

// Line Heights
$leading-none: 1;
$leading-tight: 1.25;
$leading-snug: 1.375;
$leading-normal: 1.5;
$leading-relaxed: 1.625;
$leading-loose: 2;

// Font Weights
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;

// Letter Spacing
$tracking-tighter: -0.05em;
$tracking-tight: -0.025em;
$tracking-normal: 0;
$tracking-wide: 0.025em;
$tracking-wider: 0.05em;
```

### 2.3 Spacing System

```scss
// Base unit: 4px
$space-0: 0;
$space-px: 1px;
$space-0-5: 0.125rem;  // 2px
$space-1: 0.25rem;     // 4px
$space-1-5: 0.375rem;  // 6px
$space-2: 0.5rem;      // 8px
$space-2-5: 0.625rem;  // 10px
$space-3: 0.75rem;     // 12px
$space-3-5: 0.875rem;  // 14px
$space-4: 1rem;        // 16px
$space-5: 1.25rem;     // 20px
$space-6: 1.5rem;      // 24px
$space-7: 1.75rem;     // 28px
$space-8: 2rem;        // 32px
$space-9: 2.25rem;     // 36px
$space-10: 2.5rem;     // 40px
$space-12: 3rem;       // 48px
$space-14: 3.5rem;     // 56px
$space-16: 4rem;       // 64px
$space-20: 5rem;       // 80px
$space-24: 6rem;       // 96px
```

### 2.4 Elevation & Shadows

```scss
// Shadow system
$shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
$shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
$shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
$shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
$shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
$shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
$shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);

// Focus shadow
$shadow-focus: 0 0 0 3px rgba(0, 102, 204, 0.1);
```

### 2.5 Border Radius

```scss
$rounded-none: 0;
$rounded-sm: 0.125rem;   // 2px
$rounded-md: 0.375rem;   // 6px
$rounded-lg: 0.5rem;     // 8px
$rounded-xl: 0.75rem;    // 12px
$rounded-2xl: 1rem;      // 16px
$rounded-3xl: 1.5rem;    // 24px
$rounded-full: 9999px;
```

### 2.6 Animation & Transitions

```scss
// Duration
$duration-75: 75ms;
$duration-100: 100ms;
$duration-150: 150ms;
$duration-200: 200ms;
$duration-300: 300ms;
$duration-500: 500ms;
$duration-700: 700ms;
$duration-1000: 1000ms;

// Easing
$ease-linear: linear;
$ease-in: cubic-bezier(0.4, 0, 1, 1);
$ease-out: cubic-bezier(0, 0, 0.2, 1);
$ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

// Standard transitions
$transition-all: all $duration-200 $ease-in-out;
$transition-colors: background-color, border-color, color, fill, stroke $duration-200 $ease-in-out;
$transition-opacity: opacity $duration-150 $ease-in-out;
$transition-shadow: box-shadow $duration-200 $ease-in-out;
$transition-transform: transform $duration-200 $ease-in-out;
```

---

## 3. Layout Architecture

### 3.1 Desktop Layout (≥1280px)

```
┌────────────────────────────────────────────────────────────────┐
│ Header (64px height)                                           │
│ ┌──────────────┬─────────────────────┬──────────────────────┐│
│ │ Logo & Brand │  Search/Filter Bar   │  User Menu & Actions ││
│ └──────────────┴─────────────────────┴──────────────────────┘│
├────────────────────────────────────────────────────────────────┤
│ Main Content Area (calc(100vh - 64px - 80px))                 │
│ ┌──────────────────────────────────┬─────────────────────────┐│
│ │                                  │                         ││
│ │  Chat Interface                  │  Context Panel          ││
│ │  Width: 70% (max 900px)          │  Width: 30% (min 320px)││
│ │                                  │                         ││
│ │  ┌────────────────────────────┐  │  ┌──────────────────┐  ││
│ │  │ Message Thread             │  │  │ Active Company   │  ││
│ │  │ - User messages            │  │  │ ┌──────────────┐ │  ││
│ │  │ - Assistant responses      │  │  │ │ AAPL         │ │  ││
│ │  │ - Citations inline         │  │  │ │ Apple Inc.   │ │  ││
│ │  │ - Tables & charts          │  │  │ └──────────────┘ │  ││
│ │  │ - Loading indicators       │  │  └──────────────────┘  ││
│ │  │                            │  │                         ││
│ │  │ Scroll Area                │  │  ┌──────────────────┐  ││
│ │  │                            │  │  │ Recent Filings   │  ││
│ │  └────────────────────────────┘  │  │ ┌──────────────┐ │  ││
│ │                                  │  │ │ 10-K 2024    │ │  ││
│ │                                  │  │ │ 10-Q Q3 2024 │ │  ││
│ │                                  │  │ │ 8-K 2024-01  │ │  ││
│ │                                  │  │ └──────────────┘ │  ││
│ │                                  │  └──────────────────┘  ││
│ └──────────────────────────────────┴─────────────────────────┘│
├────────────────────────────────────────────────────────────────┤
│ Input Bar (80px height)                                        │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Query Input with smart suggestions, shortcuts, actions    │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Grid System

```scss
// 12-column grid with 24px gutters
.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 24px;
  
  @media (min-width: 640px) {
    padding: 0 32px;
  }
  
  @media (min-width: 1024px) {
    padding: 0 48px;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}
```

### 3.3 Breakpoints

```scss
$breakpoint-xs: 0;       // Mobile portrait
$breakpoint-sm: 640px;   // Mobile landscape
$breakpoint-md: 768px;   // Tablet portrait
$breakpoint-lg: 1024px;  // Tablet landscape
$breakpoint-xl: 1280px;  // Desktop
$breakpoint-2xl: 1536px; // Large desktop
```

---

## 4. Component Library

### 4.1 Header Component

```tsx
interface HeaderProps {
  user?: User;
  onSearch?: (query: string) => void;
}

// Structure
<header className="header">
  <div className="header__brand">
    <Logo />
    <span className="header__title">EDGAR Answer Engine</span>
  </div>
  
  <div className="header__search">
    <SearchBar 
      placeholder="Quick search filings..."
      shortcuts={['cmd+k', 'ctrl+k']}
    />
  </div>
  
  <div className="header__actions">
    <Button variant="ghost" icon={<BookmarkIcon />} />
    <Button variant="ghost" icon={<HistoryIcon />} />
    <UserMenu user={user} />
  </div>
</header>

// Styles
.header {
  height: 64px;
  background: $white;
  border-bottom: 1px solid $gray-200;
  display: flex;
  align-items: center;
  padding: 0 $space-6;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.95);
}
```

### 4.2 Chat Message Component

```tsx
interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

// Structure
<div className={`message message--${role}`}>
  <div className="message__avatar">
    {role === 'user' ? <UserAvatar /> : <AssistantAvatar />}
  </div>
  
  <div className="message__content">
    <div className="message__header">
      <span className="message__role">
        {role === 'user' ? 'You' : 'EDGAR AI'}
      </span>
      <time className="message__time">
        {formatTime(timestamp)}
      </time>
    </div>
    
    <div className="message__body">
      {renderContentWithCitations(content, citations)}
    </div>
    
    {citations && (
      <div className="message__citations">
        {citations.map(citation => (
          <CitationCard key={citation.id} {...citation} />
        ))}
      </div>
    )}
  </div>
</div>

// Styles
.message {
  display: flex;
  gap: $space-3;
  padding: $space-4 0;
  
  &--assistant {
    .message__body {
      background: $gray-50;
      border-radius: $rounded-xl;
      padding: $space-4;
    }
  }
  
  &__avatar {
    width: 36px;
    height: 36px;
    border-radius: $rounded-full;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  &__content {
    flex: 1;
    min-width: 0;
  }
  
  &__body {
    font-size: $text-base;
    line-height: $leading-relaxed;
    color: $gray-900;
    
    // Citation superscripts
    sup {
      color: $primary-blue;
      font-size: $text-xs;
      cursor: pointer;
      margin: 0 1px;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
}
```

### 4.3 Citation Card Component

```tsx
interface CitationProps {
  number: number;
  filing: {
    form: string;
    company: string;
    filedAt: string;
    accession: string;
  };
  section: string;
  snippet: string;
  url: string;
}

// Structure
<div className="citation-card" data-citation={number}>
  <div className="citation-card__header">
    <span className="citation-card__number">{number}</span>
    <span className="citation-card__form">{filing.form}</span>
    <span className="citation-card__date">{formatDate(filing.filedAt)}</span>
  </div>
  
  <div className="citation-card__company">
    {filing.company}
  </div>
  
  <div className="citation-card__section">
    Section: {section}
  </div>
  
  <blockquote className="citation-card__snippet">
    "{snippet}"
  </blockquote>
  
  <div className="citation-card__actions">
    <Button 
      variant="link" 
      size="sm"
      onClick={() => window.open(url, '_blank')}
    >
      Open in SEC →
    </Button>
    <Button 
      variant="ghost" 
      size="sm"
      icon={<CopyIcon />}
      onClick={() => copyCitation()}
    >
      Copy
    </Button>
  </div>
</div>

// Hover card variant (for inline citations)
.citation-hover {
  position: absolute;
  width: 320px;
  padding: $space-3;
  background: $white;
  border: 1px solid $gray-200;
  border-radius: $rounded-lg;
  box-shadow: $shadow-lg;
  z-index: 1000;
  
  // Appear animation
  animation: fadeIn $duration-200 $ease-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

### 4.4 Query Input Component

```tsx
interface QueryInputProps {
  onSubmit: (query: string) => void;
  suggestions?: string[];
  isLoading?: boolean;
}

// Structure
<div className="query-input">
  <div className="query-input__container">
    <div className="query-input__shortcuts">
      <kbd>/</kbd> Commands
      <kbd>@</kbd> Companies
      <kbd>↑</kbd> History
    </div>
    
    <textarea
      className="query-input__field"
      placeholder="Ask about any SEC filing..."
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      value={query}
      rows={1}
      maxRows={4}
    />
    
    <div className="query-input__actions">
      <Button 
        variant="ghost" 
        size="sm"
        icon={<AttachIcon />}
        tooltip="Attach context"
      />
      <Button
        variant="primary"
        size="sm"
        icon={<SendIcon />}
        onClick={handleSubmit}
        disabled={!query.trim() || isLoading}
      >
        Send
      </Button>
    </div>
  </div>
  
  {showSuggestions && (
    <div className="query-input__suggestions">
      {suggestions.map(suggestion => (
        <button
          key={suggestion}
          className="query-input__suggestion"
          onClick={() => setQuery(suggestion)}
        >
          <SearchIcon size={16} />
          {suggestion}
        </button>
      ))}
    </div>
  )}
</div>

// Styles
.query-input {
  background: $white;
  border-top: 1px solid $gray-200;
  padding: $space-4 $space-6;
  
  &__container {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: $space-3;
    max-width: 900px;
    margin: 0 auto;
  }
  
  &__field {
    flex: 1;
    min-height: 44px;
    max-height: 120px;
    padding: $space-3 $space-4;
    border: 2px solid $gray-300;
    border-radius: $rounded-xl;
    font-size: $text-base;
    resize: none;
    transition: $transition-all;
    
    &:focus {
      outline: none;
      border-color: $primary-blue;
      box-shadow: $shadow-focus;
    }
  }
  
  &__suggestions {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: $white;
    border: 1px solid $gray-200;
    border-radius: $rounded-lg;
    margin-bottom: $space-2;
    box-shadow: $shadow-lg;
    max-height: 200px;
    overflow-y: auto;
  }
}
```

### 4.5 Context Panel Component

```tsx
interface ContextPanelProps {
  activeCompany?: Company;
  recentFilings?: Filing[];
  relatedQueries?: string[];
}

// Structure
<aside className="context-panel">
  <div className="context-panel__section">
    <h3 className="context-panel__title">Active Context</h3>
    {activeCompany ? (
      <CompanyCard company={activeCompany} />
    ) : (
      <EmptyState message="No company selected" />
    )}
  </div>
  
  <div className="context-panel__section">
    <h3 className="context-panel__title">Recent Filings</h3>
    <div className="context-panel__filings">
      {recentFilings?.map(filing => (
        <FilingCard key={filing.id} filing={filing} />
      ))}
    </div>
  </div>
  
  <div className="context-panel__section">
    <h3 className="context-panel__title">Quick Actions</h3>
    <div className="context-panel__actions">
      <Button variant="secondary" size="sm" fullWidth>
        Compare Companies
      </Button>
      <Button variant="secondary" size="sm" fullWidth>
        Export Results
      </Button>
      <Button variant="secondary" size="sm" fullWidth>
        View Timeline
      </Button>
    </div>
  </div>
</aside>

// Styles
.context-panel {
  height: 100%;
  background: $gray-50;
  border-left: 1px solid $gray-200;
  padding: $space-6;
  overflow-y: auto;
  
  &__section {
    margin-bottom: $space-8;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  &__title {
    font-size: $text-sm;
    font-weight: $font-semibold;
    text-transform: uppercase;
    letter-spacing: $tracking-wider;
    color: $gray-600;
    margin-bottom: $space-3;
  }
}
```

### 4.6 Data Table Component

```tsx
interface TableProps {
  columns: Column[];
  data: any[];
  sortable?: boolean;
  selectable?: boolean;
}

// Structure
<div className="data-table">
  <table className="data-table__table">
    <thead className="data-table__header">
      <tr>
        {columns.map(column => (
          <th
            key={column.key}
            className={`data-table__cell data-table__cell--header ${
              column.sortable ? 'data-table__cell--sortable' : ''
            }`}
            onClick={() => column.sortable && handleSort(column.key)}
          >
            {column.label}
            {column.sortable && <SortIcon direction={sortDirection} />}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="data-table__body">
      {data.map((row, index) => (
        <tr key={row.id || index} className="data-table__row">
          {columns.map(column => (
            <td key={column.key} className="data-table__cell">
              {renderCell(row[column.key], column)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>

// Styles
.data-table {
  width: 100%;
  overflow-x: auto;
  
  &__table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }
  
  &__header {
    background: $gray-50;
    border-bottom: 2px solid $gray-200;
  }
  
  &__cell {
    padding: $space-3 $space-4;
    text-align: left;
    font-size: $text-sm;
    
    &--header {
      font-weight: $font-semibold;
      color: $gray-700;
      white-space: nowrap;
    }
    
    &--sortable {
      cursor: pointer;
      user-select: none;
      
      &:hover {
        color: $gray-900;
      }
    }
  }
  
  &__row {
    border-bottom: 1px solid $gray-200;
    transition: $transition-colors;
    
    &:hover {
      background: $gray-50;
    }
  }
}
```

---

## 5. Interaction Patterns

### 5.1 Loading States

```tsx
// Skeleton loader for messages
<div className="skeleton-message">
  <div className="skeleton-message__avatar skeleton-pulse" />
  <div className="skeleton-message__content">
    <div className="skeleton-message__line skeleton-pulse" style={{width: '60%'}} />
    <div className="skeleton-message__line skeleton-pulse" style={{width: '80%'}} />
    <div className="skeleton-message__line skeleton-pulse" style={{width: '40%'}} />
  </div>
</div>

// Progressive loading indicator
<div className="loading-progress">
  <div className="loading-progress__steps">
    <div className="loading-step loading-step--complete">
      <CheckIcon /> Resolved company: NVIDIA Corporation
    </div>
    <div className="loading-step loading-step--complete">
      <CheckIcon /> Found 47 relevant filings
    </div>
    <div className="loading-step loading-step--active">
      <SpinnerIcon /> Analyzing content... (12 of 47)
    </div>
    <div className="loading-step loading-step--pending">
      <CircleIcon /> Generating response
    </div>
  </div>
</div>
```

### 5.2 Empty States

```tsx
// No results found
<div className="empty-state">
  <div className="empty-state__icon">
    <SearchOffIcon size={48} />
  </div>
  <h3 className="empty-state__title">No Evidence Found</h3>
  <p className="empty-state__description">
    Couldn't find information matching your query in the selected filings.
  </p>
  <div className="empty-state__suggestions">
    <h4>Try:</h4>
    <ul>
      <li>Broadening your date range</li>
      <li>Using different keywords</li>
      <li>Checking different form types</li>
    </ul>
  </div>
  <div className="empty-state__actions">
    <Button variant="secondary">Modify Search</Button>
    <Button variant="ghost">Get Help</Button>
  </div>
</div>
```

### 5.3 Error States

```tsx
// Error message component
<div className="error-message">
  <div className="error-message__icon">
    <AlertCircleIcon />
  </div>
  <div className="error-message__content">
    <h4 className="error-message__title">Unable to fetch filing</h4>
    <p className="error-message__description">
      The SEC server is temporarily unavailable. Please try again in a few moments.
    </p>
  </div>
  <div className="error-message__actions">
    <Button variant="primary" size="sm" onClick={retry}>
      Retry
    </Button>
    <Button variant="ghost" size="sm" onClick={dismiss}>
      Dismiss
    </Button>
  </div>
</div>
```

### 5.4 Tooltips & Popovers

```tsx
// Tooltip component
<Tooltip
  content="Search for companies by ticker or name"
  placement="bottom"
  delay={200}
>
  <Button icon={<InfoIcon />} />
</Tooltip>

// Implementation
.tooltip {
  position: absolute;
  padding: $space-2 $space-3;
  background: $gray-900;
  color: $white;
  font-size: $text-sm;
  border-radius: $rounded-md;
  white-space: nowrap;
  pointer-events: none;
  z-index: 9999;
  
  &::after {
    content: '';
    position: absolute;
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 4px solid $gray-900;
  }
}
```

---

## 6. Responsive Design

### 6.1 Mobile Layout (<768px)

```scss
@media (max-width: 767px) {
  // Stack layout vertically
  .main-layout {
    flex-direction: column;
    
    &__chat {
      width: 100%;
      max-width: none;
    }
    
    &__context {
      display: none; // Hidden by default
      
      &--open {
        display: block;
        position: fixed;
        top: 64px;
        right: 0;
        bottom: 0;
        width: 85%;
        max-width: 320px;
        z-index: 200;
        animation: slideIn $duration-300 $ease-out;
      }
    }
  }
  
  // Simplified header
  .header {
    &__search {
      display: none; // Hide on mobile
    }
    
    &__actions {
      margin-left: auto;
    }
  }
  
  // Full-width messages
  .message {
    padding: $space-3;
    
    &__avatar {
      width: 28px;
      height: 28px;
    }
  }
  
  // Bottom-fixed input
  .query-input {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: $space-3;
    background: $white;
    border-top: 1px solid $gray-300;
    
    // Account for iOS safe area
    padding-bottom: env(safe-area-inset-bottom, 12px);
  }
}
```

### 6.2 Tablet Layout (768px-1279px)

```scss
@media (min-width: 768px) and (max-width: 1279px) {
  .main-layout {
    &__chat {
      width: 65%;
    }
    
    &__context {
      width: 35%;
    }
  }
  
  .container {
    padding: 0 $space-4;
  }
}
```

### 6.3 Touch Interactions

```scss
// Larger touch targets on mobile
@media (hover: none) and (pointer: coarse) {
  button,
  a,
  .clickable {
    min-height: 44px;
    min-width: 44px;
  }
  
  // Disable hover effects on touch
  .message__body sup:hover {
    text-decoration: none;
  }
  
  // Use active states instead
  .button:active {
    transform: scale(0.98);
  }
}
```

---

## 7. Accessibility Standards

### 7.1 WCAG 2.1 AA Compliance

```scss
// Color contrast requirements
// Normal text: 4.5:1 minimum
// Large text: 3:1 minimum
// Interactive elements: 3:1 minimum

// Focus indicators
:focus-visible {
  outline: 2px solid $primary-blue;
  outline-offset: 2px;
}

// Skip navigation link
.skip-nav {
  position: absolute;
  top: -40px;
  left: 0;
  background: $primary-blue;
  color: $white;
  padding: $space-2 $space-4;
  z-index: 10000;
  text-decoration: none;
  
  &:focus {
    top: 0;
  }
}
```

### 7.2 ARIA Labels & Landmarks

```tsx
// Main layout
<div className="app">
  <a href="#main" className="skip-nav">Skip to main content</a>
  
  <header role="banner" aria-label="Main navigation">
    {/* Header content */}
  </header>
  
  <main id="main" role="main" aria-label="Chat interface">
    <section aria-label="Message history" role="log" aria-live="polite">
      {/* Messages */}
    </section>
  </main>
  
  <aside role="complementary" aria-label="Context panel">
    {/* Context panel */}
  </aside>
  
  <div role="form" aria-label="Query input">
    <label htmlFor="query-input" className="sr-only">
      Enter your question about SEC filings
    </label>
    <textarea
      id="query-input"
      aria-describedby="query-help"
      aria-invalid={hasError}
      aria-errormessage="query-error"
    />
    <span id="query-help" className="sr-only">
      You can ask about any SEC filing. Use @ to mention companies.
    </span>
  </div>
</div>
```

### 7.3 Keyboard Navigation

```tsx
// Keyboard shortcuts
const keyboardShortcuts = {
  'cmd+k, ctrl+k': 'Open search',
  'cmd+/, ctrl+/': 'Show commands',
  'cmd+enter': 'Send message',
  'up': 'Previous message in history',
  'down': 'Next message in history',
  'esc': 'Close modal/popover',
  'tab': 'Navigate through interactive elements',
  'shift+tab': 'Navigate backwards',
};

// Implementation
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
    
    // Send message
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
    
    // Navigate history
    if (e.key === 'ArrowUp' && isInputFocused && !hasText) {
      e.preventDefault();
      navigateHistory(-1);
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 7.4 Screen Reader Support

```tsx
// Announce dynamic content
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {loadingMessage}
</div>

// Describe complex interactions
<button
  aria-label="Open citation details for Apple Inc. 10-K filing"
  aria-expanded={isExpanded}
  aria-controls="citation-panel"
>
  <span aria-hidden="true">1</span>
</button>

// Table headers
<table role="table" aria-label="Quarterly revenue comparison">
  <thead>
    <tr role="row">
      <th role="columnheader" scope="col">Period</th>
      <th role="columnheader" scope="col">Revenue</th>
      <th role="columnheader" scope="col">YoY Change</th>
    </tr>
  </thead>
</table>
```

---

## 8. Implementation Guidelines

### 8.1 Technology Stack

```json
{
  "framework": "Next.js 14+ (App Router)",
  "ui-library": "React 18+",
  "styling": "CSS Modules + Sass or Tailwind CSS",
  "animation": "Framer Motion",
  "icons": "Lucide React",
  "charts": "Recharts or Victory",
  "date": "date-fns",
  "forms": "react-hook-form + zod",
  "state": "Zustand or Context API",
  "testing": "Jest + React Testing Library"
}
```

### 8.2 Component File Structure

```
components/
├── ui/                    # Base UI components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.module.scss
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Input/
│   ├── Card/
│   └── Modal/
├── chat/                  # Chat-specific components
│   ├── Message/
│   ├── MessageList/
│   ├── QueryInput/
│   └── CitationCard/
├── layout/               # Layout components
│   ├── Header/
│   ├── ContextPanel/
│   └── MainLayout/
└── data/                 # Data display components
    ├── DataTable/
    ├── Chart/
    └── MetricCard/
```

### 8.3 CSS Architecture

```scss
// Base styles
styles/
├── base/
│   ├── _reset.scss      // CSS reset
│   ├── _typography.scss // Font definitions
│   └── _utilities.scss  // Utility classes
├── abstracts/
│   ├── _variables.scss  // Design tokens
│   ├── _mixins.scss     // Reusable mixins
│   └── _functions.scss  // Sass functions
├── components/          // Component styles
└── main.scss           // Main entry point
```

### 8.4 Performance Optimization

```tsx
// Lazy loading
const ContextPanel = lazy(() => import('./ContextPanel'));

// Image optimization
import Image from 'next/image';

// Memoization
const MemoizedMessage = memo(Message, (prev, next) => {
  return prev.id === next.id && prev.status === next.status;
});

// Virtual scrolling for long lists
import { VariableSizeList } from 'react-window';

// Code splitting
const heavyComponent = dynamic(
  () => import('../components/HeavyComponent'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
);
```

---

## 9. Component Specifications

### 9.1 Button Component

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: () => void;
  children?: ReactNode;
}

// Usage examples
<Button variant="primary" size="lg">
  Send Query
</Button>

<Button variant="ghost" icon={<BookmarkIcon />} />

<Button variant="secondary" loading fullWidth>
  Loading...
</Button>
```

### 9.2 Input Component

```tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'search';
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  label?: string;
  placeholder?: string;
  icon?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
}

// Usage examples
<Input
  label="Company Ticker"
  placeholder="e.g., AAPL"
  icon={<SearchIcon />}
  error={errors.ticker}
/>
```

### 9.3 Modal Component

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  children: ReactNode;
}

// Usage example
<Modal
  isOpen={showDetails}
  onClose={() => setShowDetails(false)}
  title="Filing Details"
  size="lg"
>
  <FilingDetails filing={selectedFiling} />
</Modal>
```

---

## 10. State Management

### 10.1 Application State Structure

```typescript
interface AppState {
  // Chat state
  chat: {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    streamingMessageId: string | null;
  };
  
  // Context state
  context: {
    activeCompany: Company | null;
    recentFilings: Filing[];
    selectedFilings: string[];
  };
  
  // UI state
  ui: {
    sidebarOpen: boolean;
    commandPaletteOpen: boolean;
    theme: 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
  };
  
  // Search state
  search: {
    query: string;
    filters: SearchFilters;
    results: SearchResult[];
    suggestions: string[];
  };
  
  // User preferences
  preferences: {
    autoSuggest: boolean;
    streamingEnabled: boolean;
    compactMode: boolean;
    keyboardShortcuts: boolean;
  };
}
```

### 10.2 State Management Implementation

```tsx
// Using Zustand
import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  messages: [],
  isLoading: false,
  
  addMessage: (message) => set(state => ({
    messages: [...state.messages, message]
  })),
  
  updateMessage: (id, updates) => set(state => ({
    messages: state.messages.map(msg =>
      msg.id === id ? { ...msg, ...updates } : msg
    )
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  clearMessages: () => set({ messages: [] }),
}));

// Usage in components
function ChatInterface() {
  const { messages, isLoading, addMessage } = useChatStore();
  
  return (
    <div>
      {messages.map(msg => (
        <Message key={msg.id} {...msg} />
      ))}
    </div>
  );
}
```

---

## Appendix A: Design Tokens

```json
{
  "colors": {
    "primary": {
      "50": "#E6F0FF",
      "100": "#CCE0FF",
      "200": "#99C2FF",
      "300": "#66A3FF",
      "400": "#3385FF",
      "500": "#0066CC",
      "600": "#0052A3",
      "700": "#003D7A",
      "800": "#002952",
      "900": "#001429"
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "2xl": "48px",
    "3xl": "64px"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  }
}
```

## Appendix B: Component Checklist

- [ ] Button (all variants)
- [ ] Input (text, search, textarea)
- [ ] Select/Dropdown
- [ ] Checkbox & Radio
- [ ] Toggle Switch
- [ ] Modal/Dialog
- [ ] Tooltip
- [ ] Popover
- [ ] Alert/Toast
- [ ] Badge
- [ ] Avatar
- [ ] Card
- [ ] Skeleton Loader
- [ ] Progress Bar
- [ ] Spinner
- [ ] Tabs
- [ ] Accordion
- [ ] Breadcrumb
- [ ] Pagination
- [ ] Data Table
- [ ] Chart Components
- [ ] Empty State
- [ ] Error Boundary

## Appendix C: Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

---

*This design specification provides all necessary details for implementing the EDGAR Answer Engine UI. Follow the component specifications, use the design tokens consistently, and ensure all accessibility standards are met.*