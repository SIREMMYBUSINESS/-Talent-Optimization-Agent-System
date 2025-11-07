# Quick Start Guide - Talent Optimization Dashboard

## Getting Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Supabase account and project
- Modern web browser

### 1. Environment Setup

Create or verify your `.env` file:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### 4. Sign Up & Login

1. Navigate to `http://localhost:5173/signup`
2. Create an account with email/password
3. Login at `http://localhost:5173/`
4. You'll be redirected to the dashboard

## Dashboard Features Overview

### Main Dashboard View

Once logged in, you'll see:

1. **Top Metrics Row** (4 KPI cards)
   - Total Candidates
   - Active Applications
   - Open Positions
   - Average Screening Score

2. **Pipeline Chart**
   - Visual representation of candidate stages
   - Bar chart showing counts per stage

3. **Screening Insights**
   - Recent AI screening results
   - Match scores (0-100)
   - Bias detection flags
   - Matched skills

4. **Job Postings Table**
   - List of open positions
   - Applicant counts
   - Status indicators
   - Posted dates

5. **Live Audit Stream**
   - Real-time event monitoring
   - SSE connection status indicator
   - Color-coded event types

### Navigation Tabs

- **Overview**: Main dashboard (current view)
- **Candidates**: Detailed candidate management (coming soon)
- **Jobs**: Job posting management (coming soon)
- **Screening**: Screening results analysis (coming soon)
- **Compliance**: Audit logs and compliance reports (coming soon)

## Sample Data

To see the dashboard in action, you need data in your Supabase tables:

### Add Sample Candidates

```sql
INSERT INTO candidates (full_name, email, skills, experience_years)
VALUES
  ('John Doe', 'john@example.com', '["python", "react", "sql"]', 5),
  ('Jane Smith', 'jane@example.com', '["javascript", "node", "aws"]', 3);
```

### Add Sample Job Postings

```sql
INSERT INTO job_postings (title, department, status, posted_by)
VALUES
  ('Senior Software Engineer', 'Engineering', 'published', auth.uid()),
  ('Product Manager', 'Product', 'published', auth.uid());
```

### Add Sample Applications

```sql
INSERT INTO applications (job_posting_id, candidate_id, status)
SELECT
  (SELECT id FROM job_postings LIMIT 1),
  (SELECT id FROM candidates LIMIT 1),
  'screening';
```

### Add Sample Screening Results

```sql
INSERT INTO screening_results (application_id, overall_score, recommendation, skills_match)
SELECT
  id,
  85,
  'strong_match',
  '{"matched": ["python", "react"]}'
FROM applications LIMIT 1;
```

## Testing the Live Audit Stream

The audit stream connects to your FastAPI backend at `/admin/audit-logs/stream`.

To test it:

1. Make sure your FastAPI backend is running
2. The dashboard will auto-connect via SSE
3. Look for the green "Connected" indicator
4. Events will appear in real-time as they're logged

## Common Issues

### Dashboard Shows No Data
- Check that your Supabase tables have been created via migrations
- Verify RLS policies are correctly configured
- Add sample data using the SQL queries above

### SSE Connection Failed
- Ensure FastAPI backend is running
- Check CORS configuration allows your frontend origin
- Verify JWT token is valid

### Build Warnings
- The "chunk size" warning is informational
- Consider code-splitting for production optimization
- Does not affect functionality

## Next Steps

1. **Customize Roles**: Update user profiles with role assignments
2. **Add Real Data**: Integrate with your HR systems
3. **Configure Backend**: Set up FastAPI endpoints for full functionality
4. **Deploy**: Build for production with `npm run build`

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Support

For issues or questions:
- Check `DASHBOARD.md` for detailed documentation
- Review Supabase logs for database errors
- Check browser console for frontend errors
- Review FastAPI logs for backend issues

## Production Deployment

### Build for Production
```bash
npm run build
```

The `dist/` folder contains your production-ready static files.

### Deploy Options
- **Vercel**: Connect your repo and deploy automatically
- **Netlify**: Drag and drop the `dist/` folder
- **AWS S3 + CloudFront**: Upload to S3 bucket
- **Docker**: Use the included Dockerfile

### Environment Variables (Production)
Make sure to set production environment variables in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Architecture

```
Frontend (React + Vite + Tailwind)
    ↓
Supabase (PostgreSQL + Auth + RLS)
    ↓
FastAPI Backend (Python)
    ↓
Redis (Caching + Rate Limiting)
    ↓
External Services (Workday, NVIDIA NIM)
```

Happy building!
