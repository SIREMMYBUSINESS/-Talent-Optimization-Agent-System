/*
  # Seed Sample Data for Dashboard

  ## Overview
  Populates the database with realistic sample data to demonstrate dashboard functionality.

  ## Data Created
  - 10 sample candidates with diverse skills
  - 8 open job postings across different departments
  - 25 applications linking candidates to jobs
  - 20 screening results with scores and recommendations
  - 15 audit logs for live stream demonstration
*/

-- Insert sample candidates
INSERT INTO candidates (full_name, email, phone, resume_url, linkedin_url, skills, experience_years, created_at) VALUES
  ('Sarah Chen', 'sarah.chen@email.com', '+1-555-0101', 'https://example.com/resumes/sarah-chen.pdf', 'https://linkedin.com/in/sarahchen', '["Python", "AWS", "Docker", "Kubernetes", "Go"]'::jsonb, 7, now() - interval '25 days'),
  ('Marcus Johnson', 'marcus.j@email.com', '+1-555-0102', 'https://example.com/resumes/marcus-johnson.pdf', 'https://linkedin.com/in/marcusj', '["React", "TypeScript", "CSS", "JavaScript", "Node.js"]'::jsonb, 5, now() - interval '20 days'),
  ('Priya Patel', 'priya.patel@email.com', '+1-555-0103', 'https://example.com/resumes/priya-patel.pdf', 'https://linkedin.com/in/priyapatel', '["Python", "TensorFlow", "SQL", "Pandas", "Scikit-learn"]'::jsonb, 6, now() - interval '18 days'),
  ('David Kim', 'david.kim@email.com', '+1-555-0104', 'https://example.com/resumes/david-kim.pdf', 'https://linkedin.com/in/davidkim', '["Product Strategy", "Agile", "Data Analysis", "Roadmapping"]'::jsonb, 8, now() - interval '15 days'),
  ('Elena Rodriguez', 'elena.r@email.com', '+1-555-0105', 'https://example.com/resumes/elena-rodriguez.pdf', 'https://linkedin.com/in/elenarodriguez', '["Kubernetes", "Terraform", "AWS", "Jenkins", "Docker"]'::jsonb, 6, now() - interval '12 days'),
  ('James Wilson', 'james.wilson@email.com', '+1-555-0106', 'https://example.com/resumes/james-wilson.pdf', 'https://linkedin.com/in/jameswilson', '["Node.js", "React", "PostgreSQL", "MongoDB", "GraphQL"]'::jsonb, 4, now() - interval '10 days'),
  ('Aisha Mohammed', 'aisha.m@email.com', '+1-555-0107', 'https://example.com/resumes/aisha-mohammed.pdf', 'https://linkedin.com/in/aishamohammed', '["Python", "PyTorch", "Kubernetes", "MLOps", "FastAPI"]'::jsonb, 5, now() - interval '8 days'),
  ('Michael Brown', 'michael.brown@email.com', '+1-555-0108', 'https://example.com/resumes/michael-brown.pdf', 'https://linkedin.com/in/michaelbrown', '["Figma", "User Research", "Design Systems", "Prototyping"]'::jsonb, 7, now() - interval '6 days'),
  ('Yuki Tanaka', 'yuki.tanaka@email.com', '+1-555-0109', 'https://example.com/resumes/yuki-tanaka.pdf', 'https://linkedin.com/in/yukitanaka', '["Java", "Spring Boot", "Microservices", "AWS"]'::jsonb, 6, now() - interval '4 days'),
  ('Sofia Garcia', 'sofia.garcia@email.com', '+1-555-0110', 'https://example.com/resumes/sofia-garcia.pdf', 'https://linkedin.com/in/sofiagarcia', '["React", "Vue.js", "CSS", "UI/UX", "Accessibility"]'::jsonb, 3, now() - interval '2 days')
ON CONFLICT (email) DO NOTHING;

-- Insert sample job postings
INSERT INTO job_postings (title, department, description, requirements, status, salary_range, location, created_at) VALUES
  ('Senior Software Engineer', 'Engineering', 'Lead development of cloud-native applications', '{"experience": "5+ years", "skills": ["Python", "AWS", "Docker"]}'::jsonb, 'published', '{"min": 140000, "max": 180000}'::jsonb, 'San Francisco, CA', now() - interval '30 days'),
  ('Frontend Developer', 'Engineering', 'Build modern web applications with React', '{"experience": "3+ years", "skills": ["React", "TypeScript", "CSS"]}'::jsonb, 'published', '{"min": 100000, "max": 140000}'::jsonb, 'Remote', now() - interval '28 days'),
  ('Data Scientist', 'Data', 'Develop ML models for predictive analytics', '{"experience": "4+ years", "skills": ["Python", "TensorFlow", "SQL"]}'::jsonb, 'published', '{"min": 130000, "max": 170000}'::jsonb, 'New York, NY', now() - interval '25 days'),
  ('Product Manager', 'Product', 'Drive product strategy and roadmap', '{"experience": "5+ years", "skills": ["Product Strategy", "Agile", "Data Analysis"]}'::jsonb, 'published', '{"min": 150000, "max": 190000}'::jsonb, 'Austin, TX', now() - interval '22 days'),
  ('DevOps Engineer', 'Engineering', 'Maintain CI/CD pipelines and infrastructure', '{"experience": "4+ years", "skills": ["Kubernetes", "Terraform", "AWS"]}'::jsonb, 'published', '{"min": 120000, "max": 160000}'::jsonb, 'Seattle, WA', now() - interval '20 days'),
  ('Full Stack Engineer', 'Engineering', 'Work across frontend and backend systems', '{"experience": "3+ years", "skills": ["Node.js", "React", "PostgreSQL"]}'::jsonb, 'published', '{"min": 110000, "max": 150000}'::jsonb, 'Remote', now() - interval '15 days'),
  ('Machine Learning Engineer', 'Data', 'Build and deploy ML models at scale', '{"experience": "4+ years", "skills": ["Python", "PyTorch", "Kubernetes"]}'::jsonb, 'published', '{"min": 140000, "max": 180000}'::jsonb, 'San Francisco, CA', now() - interval '10 days'),
  ('Senior Product Designer', 'Design', 'Lead UX/UI design for flagship products', '{"experience": "5+ years", "skills": ["Figma", "User Research", "Design Systems"]}'::jsonb, 'published', '{"min": 130000, "max": 170000}'::jsonb, 'Remote', now() - interval '5 days')
ON CONFLICT DO NOTHING;

-- Insert applications
DO $$
DECLARE
  candidate_ids uuid[];
  job_ids uuid[];
  i int;
  statuses text[] := ARRAY['submitted', 'screening', 'screening', 'review', 'interview', 'offer'];
BEGIN
  SELECT array_agg(id) INTO candidate_ids FROM candidates LIMIT 10;
  SELECT array_agg(id) INTO job_ids FROM job_postings WHERE status = 'published' LIMIT 8;
  
  IF candidate_ids IS NOT NULL AND job_ids IS NOT NULL AND array_length(candidate_ids, 1) > 0 AND array_length(job_ids, 1) > 0 THEN
    FOR i IN 1..25 LOOP
      BEGIN
        INSERT INTO applications (candidate_id, job_posting_id, status, applied_at, created_at)
        VALUES (
          candidate_ids[1 + ((i - 1) % array_length(candidate_ids, 1))],
          job_ids[1 + ((i - 1) % array_length(job_ids, 1))],
          statuses[1 + ((i - 1) % array_length(statuses, 1))],
          now() - (interval '1 day' * (30 - i)),
          now() - (interval '1 day' * (30 - i))
        );
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END LOOP;
  END IF;
END $$;

-- Insert screening results
DO $$
DECLARE
  app_records RECORD;
  i int := 1;
  recommendations text[] := ARRAY['strong_match', 'good_match', 'good_match', 'potential_match', 'potential_match', 'no_match'];
  scores int[] := ARRAY[95, 88, 85, 78, 72, 68, 65, 58, 52, 45];
  skill_sets jsonb[] := ARRAY[
    '{"matched": ["Python", "AWS", "Docker", "Kubernetes"], "missing": ["Go"]}'::jsonb,
    '{"matched": ["React", "TypeScript", "CSS", "JavaScript"], "missing": ["Vue.js"]}'::jsonb,
    '{"matched": ["Python", "TensorFlow", "SQL", "Pandas"], "missing": ["PyTorch"]}'::jsonb,
    '{"matched": ["Product Strategy", "Agile", "Data Analysis"], "missing": ["B2B SaaS"]}'::jsonb,
    '{"matched": ["Kubernetes", "Terraform", "AWS"], "missing": ["Azure"]}'::jsonb,
    '{"matched": ["Node.js", "React", "PostgreSQL"], "missing": ["MongoDB"]}'::jsonb,
    '{"matched": ["Python", "PyTorch"], "missing": ["TensorFlow", "Kubernetes"]}'::jsonb,
    '{"matched": ["Figma", "User Research"], "missing": ["Design Systems"]}'::jsonb
  ];
  bias_flags jsonb[] := ARRAY[
    '[]'::jsonb,
    '[]'::jsonb,
    '["age_reference"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '["gender_assumption"]'::jsonb
  ];
BEGIN
  FOR app_records IN SELECT id FROM applications ORDER BY created_at DESC LIMIT 20 LOOP
    BEGIN
      INSERT INTO screening_results (
        application_id,
        overall_score,
        recommendation,
        skills_match,
        bias_flags,
        screened_at,
        created_at
      ) VALUES (
        app_records.id,
        scores[1 + ((i - 1) % array_length(scores, 1))],
        recommendations[1 + ((i - 1) % array_length(recommendations, 1))],
        skill_sets[1 + ((i - 1) % array_length(skill_sets, 1))],
        bias_flags[1 + ((i - 1) % array_length(bias_flags, 1))],
        now() - (interval '1 hour' * (20 - i)),
        now() - (interval '1 hour' * (20 - i))
      );
      i := i + 1;
    EXCEPTION WHEN unique_violation THEN
      i := i + 1;
    END;
  END LOOP;
END $$;

-- Insert audit logs
DO $$
DECLARE
  actions text[] := ARRAY[
    'candidate_created',
    'application_submitted',
    'screening_completed',
    'interview_scheduled',
    'offer_extended',
    'application_viewed',
    'resume_downloaded',
    'compliance_check_passed'
  ];
  i int;
BEGIN
  FOR i IN 1..15 LOOP
    INSERT INTO audit_logs (
      action,
      resource_type,
      resource_id,
      metadata,
      created_at
    ) VALUES (
      actions[1 + ((i - 1) % array_length(actions, 1))],
      CASE 
        WHEN (i % 3) = 0 THEN 'candidate'
        WHEN (i % 3) = 1 THEN 'application'
        ELSE 'screening_result'
      END,
      gen_random_uuid(),
      jsonb_build_object(
        'timestamp', now() - (interval '1 minute' * (15 - i)),
        'success', true,
        'details', 'Sample audit event for dashboard demonstration'
      ),
      now() - (interval '1 minute' * (15 - i))
    );
  END LOOP;
END $$;
