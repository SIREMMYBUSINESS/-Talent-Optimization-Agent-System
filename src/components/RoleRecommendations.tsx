import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  Award,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Users,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { resumeScreeningService, JobRequirement, RoleRecommendation } from '../services/resumeScreeningService';

interface RoleRecommendationsProps {
  userId: string;
}

const RoleRecommendations: React.FC<RoleRecommendationsProps> = ({ userId }) => {
  const [jobs, setJobs] = useState<JobRequirement[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<RoleRecommendation[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRequirement | null>(null);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [newJob, setNewJob] = useState({
    job_title: '',
    department: '',
    required_skills: '',
    preferred_skills: '',
    min_experience: 0,
    education_required: 'Bachelor'
  });

  useEffect(() => {
    loadJobs();
    loadCandidates();
  }, [userId]);

  const loadJobs = async () => {
    try {
      const data = await resumeScreeningService.getJobRequirements(userId);
      setJobs(data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const loadCandidates = async () => {
    try {
      const data = await resumeScreeningService.getAllCandidates(userId);
      setCandidates(data);
    } catch (error) {
      console.error('Failed to load candidates:', error);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const jobData = {
        ...newJob,
        required_skills: newJob.required_skills.split(',').map(s => s.trim()).filter(s => s),
        preferred_skills: newJob.preferred_skills.split(',').map(s => s.trim()).filter(s => s)
      };

      await resumeScreeningService.createJobRequirement(userId, jobData);

      setShowCreateJob(false);
      setNewJob({
        job_title: '',
        department: '',
        required_skills: '',
        preferred_skills: '',
        min_experience: 0,
        education_required: 'Bachelor'
      });

      loadJobs();
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  };

  const handleMatchCandidates = async (jobId: string) => {
    try {
      const matchedCandidates = [];

      for (const candidate of candidates) {
        const recs = await resumeScreeningService.matchCandidateToJobs(candidate.id, userId);
        const jobRec = recs.find(r => r.job_id === jobId);
        if (jobRec) {
          matchedCandidates.push({
            ...candidate,
            recommendation: jobRec
          });
        }
      }

      setRecommendations(matchedCandidates.map(c => c.recommendation));
    } catch (error) {
      console.error('Failed to match candidates:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { text: 'Excellent Match', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
    if (score >= 60) return { text: 'Good Match', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
    return { text: 'Poor Match', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-rose-600 bg-clip-text text-transparent mb-3">
            Role Recommendations
          </h1>
          <p className="text-gray-400 text-lg">AI-powered candidate-to-role matching</p>
        </div>
        <button
          onClick={() => setShowCreateJob(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Create Job</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-2">
            <Briefcase className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400">Active Jobs</span>
          </div>
          <div className="text-3xl font-bold text-white">{jobs.length}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400">Candidates</span>
          </div>
          <div className="text-3xl font-bold text-white">{candidates.length}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-2">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <span className="text-gray-400">Matches Found</span>
          </div>
          <div className="text-3xl font-bold text-white">{recommendations.length}</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <h2 className="text-2xl font-bold text-white mb-6">Job Openings</h2>

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No job openings yet</p>
            <button
              onClick={() => setShowCreateJob(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
            >
              Create Your First Job
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="group p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{job.job_title}</h3>
                    <p className="text-gray-400">{job.department}</p>
                  </div>
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Min Experience</span>
                    <span className="text-white font-medium">{job.min_experience} years</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Education</span>
                    <span className="text-white font-medium">{job.education_required}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.slice(0, 5).map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded-lg border border-blue-500/30"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.required_skills.length > 5 && (
                      <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded-lg">
                        +{job.required_skills.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedJob(job);
                    handleMatchCandidates(job.id);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300"
                >
                  <Target className="w-4 h-4" />
                  <span className="font-medium">Find Matches</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedJob && recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <h2 className="text-2xl font-bold text-white mb-6">
            Candidates for {selectedJob.job_title}
          </h2>

          <div className="space-y-4">
            {recommendations.map((rec) => {
              const scoreBadge = getScoreBadge(rec.compatibility_score);
              return (
                <div
                  key={rec.id}
                  className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg">
                        C
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Candidate #{rec.candidate_id.substring(0, 8)}</h3>
                        <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium border ${scoreBadge.color}`}>
                          {scoreBadge.text}
                        </span>
                      </div>
                    </div>

                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getScoreColor(rec.compatibility_score)} flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-lg">{rec.compatibility_score}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-700/30 rounded-xl">
                      <p className="text-gray-400 text-xs mb-1">Overall Match</p>
                      <p className="text-white font-semibold">{rec.compatibility_score}%</p>
                    </div>
                    <div className="text-center p-3 bg-gray-700/30 rounded-xl">
                      <p className="text-gray-400 text-xs mb-1">Skills Match</p>
                      <p className="text-white font-semibold">{rec.skill_match_score}%</p>
                    </div>
                    <div className="text-center p-3 bg-gray-700/30 rounded-xl">
                      <p className="text-gray-400 text-xs mb-1">Experience</p>
                      <p className="text-white font-semibold">{rec.experience_match_score}%</p>
                    </div>
                  </div>

                  {rec.reasoning && (
                    <div className="p-4 bg-purple-600/10 rounded-xl border border-purple-500/30">
                      <p className="text-purple-300 text-sm">{rec.reasoning}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCreateJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl border border-gray-700 max-w-2xl w-full">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Create Job Opening</h2>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={newJob.job_title}
                  onChange={(e) => setNewJob({ ...newJob, job_title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={newJob.department}
                  onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Required Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={newJob.required_skills}
                  onChange={(e) => setNewJob({ ...newJob, required_skills: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="javascript, react, node.js"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Preferred Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={newJob.preferred_skills}
                  onChange={(e) => setNewJob({ ...newJob, preferred_skills: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="typescript, graphql, aws"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Min Experience (years)
                  </label>
                  <input
                    type="number"
                    value={newJob.min_experience}
                    onChange={(e) => setNewJob({ ...newJob, min_experience: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Education Required
                  </label>
                  <select
                    value={newJob.education_required}
                    onChange={(e) => setNewJob({ ...newJob, education_required: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="High School">High School</option>
                    <option value="Associate">Associate</option>
                    <option value="Bachelor">Bachelor</option>
                    <option value="Master">Master</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateJob(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-300"
                >
                  Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleRecommendations;
