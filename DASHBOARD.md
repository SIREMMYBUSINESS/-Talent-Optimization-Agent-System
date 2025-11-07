# Talent Optimization Dashboard

A comprehensive, real-time dashboard for managing talent workflows, hiring pipelines, and compliance monitoring.

## Features

### Core Capabilities

- **Real-Time Metrics**: Live KPI tracking with auto-refresh every 30 seconds
- **Candidate Pipeline Visualization**: Interactive charts showing application stages and conversion rates
- **Resume Screening Insights**: AI-powered screening results with match scores and bias detection
- **Job Postings Management**: Overview of open positions with applicant tracking
- **Live Audit Stream**: Server-Sent Events (SSE) connection for real-time compliance monitoring
- **Role-Based Access Control**: Permissions system for Admin, HR Manager, Recruiter, Auditor, and Employee roles
- **Responsive Design**: Mobile-friendly layout with Tailwind CSS
- **Dark Mode Support**: Theme toggle with persistent preferences

### Dashboard Sections

#### 1. Overview
- Total Candidates metric card
- Active Applications count
- Open Positions tracker
- Average Screening Score indicator
- Candidate Pipeline chart (by stage)
- Recent Screening Insights
- Job Postings table
- Live Audit Stream

#### 2. Candidate Pipeline
- Visual funnel showing: Submitted → Screening → Review → Interview → Offer → Hired
- Conversion rates between stages
- Stage-specific filtering

#### 3. Job Postings
- List of all open positions
- Applicant count per position
- Time-to-fill metrics
- Department and location filtering

#### 4. Screening Insights
- AI match scores (0-100)
- Matched skills visualization
- Recommendation badges (Strong Match, Good Match, etc.)
- Bias flag warnings
- Candidate-to-job mapping

#### 5. Compliance & Audit Logs
- Real-time event streaming via SSE
- Event type categorization
- User activity tracking
- Payload inspection

## Technical Architecture

### Frontend Stack
- **React 18** with TypeScript
- **React Router** for navigation
- **Zustand** for state management
- **TanStack Query (React Query)** for data fetching and caching
- **Recharts** for data visualization
- **Tailwind CSS** for styling
- **date-fns** for date formatting

### Data Layer
- **Supabase** for PostgreSQL database
- Real-time subscriptions for live updates
- Row Level Security (RLS) for data protection
- Optimized queries with proper indexing

### Backend Integration
- FastAPI endpoints for metrics aggregation
- SSE stream at `/admin/audit-logs/stream`
- JWT-based authentication
- Role-based endpoint protection

## Components

### Core Components

```
src/
├── components/
│   ├── MetricsCard.tsx          # KPI display cards
│   ├── PipelineChart.tsx        # Candidate pipeline visualization
│   ├── JobPostingsTable.tsx     # Job listings table
│   ├── ScreeningInsights.tsx    # AI screening results
│   ├── AuditLogStream.tsx       # Live SSE event stream
│   ├── LoadingSpinner.tsx       # Loading states
│   ├── EmptyState.tsx           # No data placeholder
│   ├── ErrorBoundary.tsx        # Error handling
│   └── StatsOverview.tsx        # Statistics grid
├── layouts/
│   └── DashboardLayout.tsx      # Main layout with nav
├── hooks/
│   └── useDashboardData.ts      # Data fetching hooks
├── store/
│   ├── authStore.ts             # Authentication state
│   └── themeStore.ts            # Theme preferences
├── types/
│   └── dashboard.ts             # TypeScript interfaces
└── utils/
    ├── formatters.ts            # Number/date formatting
    └── permissions.ts           # Role-based access control
```

## Data Fetching Strategy

### React Query Configuration
- **Stale Time**: 30 seconds
- **Refetch Interval**: 30 seconds for live data
- **Retry**: 1 attempt on failure
- **Cache**: Persistent across component unmounts

### Queries

```typescript
useDashboardMetrics()      // Overall KPIs
useCandidatePipeline()     // Pipeline stage data
useJobPostings()           // Job listings
useScreeningResults(limit) // Recent screening results
```

## Role-Based Permissions

| Role        | View Candidates | Edit Candidates | View Jobs | Edit Jobs | View Screening | View Audits | View Compliance |
|-------------|-----------------|-----------------|-----------|-----------|----------------|-------------|-----------------|
| Admin       | ✅              | ✅              | ✅        | ✅        | ✅             | ✅          | ✅              |
| HR Manager  | ✅              | ✅              | ✅        | ✅        | ✅             | ✅          | ✅              |
| Recruiter   | ✅              | ✅              | ✅        | ✅        | ✅             | ❌          | ❌              |
| Auditor     | ✅              | ❌              | ✅        | ❌        | ✅             | ✅          | ✅              |
| Employee    | ❌              | ❌              | ✅        | ❌        | ❌             | ❌          | ❌              |

## Environment Variables

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Usage

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Testing
```bash
npm run lint
```

## Performance Optimizations

1. **Code Splitting**: Route-based lazy loading
2. **Query Caching**: 30-second cache with background refetch
3. **Memoization**: React.memo on expensive components
4. **Debouncing**: Search and filter inputs
5. **Virtual Scrolling**: Large data tables (future enhancement)
6. **CDN Assets**: Static asset optimization

## Security Considerations

- **JWT Authentication**: Supabase Auth with secure session management
- **RLS Policies**: Database-level access control
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: SameSite cookies
- **Rate Limiting**: API throttling via Redis (backend)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader optimizations
- High contrast mode compatibility
- Focus management

## Future Enhancements

1. **Advanced Filtering**: Multi-criteria filter builder
2. **Export Functionality**: CSV/PDF report generation
3. **Custom Dashboards**: User-configurable widget layouts
4. **Notifications Center**: In-app notification system
5. **Analytics**: Advanced reporting and trends analysis
6. **Mobile App**: React Native companion app
7. **Integrations**: Slack, Teams, Email notifications
8. **AI Insights**: Predictive analytics and recommendations

## Troubleshooting

### SSE Connection Issues
- Check CORS configuration on FastAPI backend
- Verify JWT token is valid and not expired
- Ensure `/admin/audit-logs/stream` endpoint is accessible

### Data Not Loading
- Check Supabase connection status
- Verify RLS policies are correctly configured
- Check browser console for network errors

### Performance Issues
- Clear browser cache and Supabase cache
- Check network tab for slow queries
- Monitor React Query DevTools (add as dev dependency)

## License

MIT
