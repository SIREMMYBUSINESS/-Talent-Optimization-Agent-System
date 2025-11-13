import * as tf from '@tensorflow/tfjs';
import { DifferentialPrivacyManager } from '../ml/privacy/DifferentialPrivacy';

export interface ExtractedResumeData {
  skills: ExtractedSkill[];
  experience: ExperienceInfo;
  education: EducationInfo;
  certifications: string[];
  summary: string;
}

export interface ExtractedSkill {
  name: string;
  category: 'technical' | 'soft' | 'domain' | 'certification';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience: number;
  relevance: number;
}

export interface ExperienceInfo {
  totalYears: number;
  roles: {
    title: string;
    company: string;
    duration: number;
    responsibilities: string[];
  }[];
}

export interface EducationInfo {
  highestDegree: string;
  field: string;
  institution: string;
  graduationYear?: number;
}

export interface MatchResult {
  matchScore: number;
  confidenceScore: number;
  skillMatches: SkillMatch[];
  experienceMatch: number;
  educationMatch: number;
  recommendations: string[];
}

export interface SkillMatch {
  skill: string;
  required: boolean;
  found: boolean;
  proficiency: string;
  weight: number;
}

export class NLPResumeProcessor {
  private privacyManager: DifferentialPrivacyManager;
  private technicalSkills: Set<string>;
  private softSkills: Set<string>;
  private domainSkills: Set<string>;

  constructor() {
    this.privacyManager = new DifferentialPrivacyManager({
      epsilon: 1.0,
      delta: 1e-5,
      clipNorm: 1.0,
      noiseMultiplier: 1.1
    });

    this.technicalSkills = new Set([
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'swift',
      'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
      'git', 'ci/cd', 'jenkins', 'github actions',
      'html', 'css', 'sass', 'tailwind',
      'rest api', 'graphql', 'microservices', 'websockets',
      'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
      'machine learning', 'deep learning', 'nlp', 'computer vision',
      'agile', 'scrum', 'kanban', 'jira'
    ]);

    this.softSkills = new Set([
      'leadership', 'communication', 'teamwork', 'problem solving',
      'critical thinking', 'time management', 'adaptability', 'creativity',
      'collaboration', 'presentation', 'negotiation', 'conflict resolution',
      'emotional intelligence', 'mentoring', 'project management'
    ]);

    this.domainSkills = new Set([
      'healthcare', 'finance', 'e-commerce', 'education', 'manufacturing',
      'retail', 'insurance', 'telecommunications', 'logistics',
      'crm', 'erp', 'sales', 'marketing', 'customer service',
      'data analysis', 'business intelligence', 'product management'
    ]);
  }

  async processResume(resumeText: string): Promise<ExtractedResumeData> {
    const normalizedText = this.normalizeText(resumeText);

    const skills = this.extractSkills(normalizedText);
    const experience = this.extractExperience(normalizedText);
    const education = this.extractEducation(normalizedText);
    const certifications = this.extractCertifications(normalizedText);
    const summary = this.generateSummary(normalizedText);

    return {
      skills: this.applyPrivacyToSkills(skills),
      experience,
      education,
      certifications,
      summary
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s.@-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractSkills(text: string): ExtractedSkill[] {
    const foundSkills: ExtractedSkill[] = [];

    this.technicalSkills.forEach(skill => {
      if (this.findSkillInText(text, skill)) {
        foundSkills.push({
          name: skill,
          category: 'technical',
          proficiency: this.estimateProficiency(text, skill),
          yearsExperience: this.estimateYearsExperience(text, skill),
          relevance: this.calculateRelevance(text, skill)
        });
      }
    });

    this.softSkills.forEach(skill => {
      if (this.findSkillInText(text, skill)) {
        foundSkills.push({
          name: skill,
          category: 'soft',
          proficiency: 'intermediate',
          yearsExperience: 0,
          relevance: 70
        });
      }
    });

    this.domainSkills.forEach(skill => {
      if (this.findSkillInText(text, skill)) {
        foundSkills.push({
          name: skill,
          category: 'domain',
          proficiency: 'intermediate',
          yearsExperience: this.estimateYearsExperience(text, skill),
          relevance: 75
        });
      }
    });

    return foundSkills;
  }

  private findSkillInText(text: string, skill: string): boolean {
    const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return skillRegex.test(text);
  }

  private estimateProficiency(text: string, skill: string): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const expertTerms = ['expert', 'senior', 'lead', 'architect', 'principal', 'advanced'];
    const advancedTerms = ['proficient', 'experienced', 'skilled', 'strong'];
    const beginnerTerms = ['basic', 'beginner', 'learning', 'familiar'];

    const contextWindow = this.getContextWindow(text, skill, 50);

    if (expertTerms.some(term => contextWindow.includes(term))) {
      return 'expert';
    }
    if (advancedTerms.some(term => contextWindow.includes(term))) {
      return 'advanced';
    }
    if (beginnerTerms.some(term => contextWindow.includes(term))) {
      return 'beginner';
    }
    return 'intermediate';
  }

  private estimateYearsExperience(text: string, skill: string): number {
    const contextWindow = this.getContextWindow(text, skill, 100);
    const yearPattern = /(\d+)\s*(?:\+)?\s*years?/i;
    const match = contextWindow.match(yearPattern);

    if (match) {
      return Math.min(parseInt(match[1], 10), 20);
    }

    const occurrences = (text.match(new RegExp(skill, 'gi')) || []).length;
    if (occurrences >= 5) return 5;
    if (occurrences >= 3) return 3;
    if (occurrences >= 1) return 1;
    return 0;
  }

  private calculateRelevance(text: string, skill: string): number {
    const occurrences = (text.match(new RegExp(skill, 'gi')) || []).length;
    const proximity = this.checkProximityToKeywords(text, skill);

    let relevance = 50;
    relevance += Math.min(occurrences * 10, 30);
    relevance += proximity ? 20 : 0;

    return Math.min(relevance, 100);
  }

  private checkProximityToKeywords(text: string, skill: string): boolean {
    const keywords = ['experience', 'expertise', 'proficient', 'worked', 'developed', 'built', 'designed'];
    const contextWindow = this.getContextWindow(text, skill, 50);

    return keywords.some(keyword => contextWindow.includes(keyword));
  }

  private getContextWindow(text: string, term: string, windowSize: number): string {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - windowSize);
    const end = Math.min(text.length, index + term.length + windowSize);

    return text.substring(start, end);
  }

  private extractExperience(text: string): ExperienceInfo {
    const totalYearsPattern = /(\d+)\s*(?:\+)?\s*years?\s*(?:of)?\s*experience/i;
    const match = text.match(totalYearsPattern);
    const totalYears = match ? Math.min(parseInt(match[1], 10), 50) : 0;

    const roles = this.extractRoles(text);

    return {
      totalYears: totalYears || this.estimateTotalYears(roles),
      roles
    };
  }

  private extractRoles(text: string): ExperienceInfo['roles'] {
    const roles: ExperienceInfo['roles'] = [];
    const jobTitles = [
      'software engineer', 'developer', 'architect', 'manager', 'director',
      'analyst', 'consultant', 'specialist', 'lead', 'senior', 'junior',
      'designer', 'data scientist', 'product manager', 'scrum master'
    ];

    jobTitles.forEach(title => {
      if (text.includes(title)) {
        roles.push({
          title: title,
          company: 'Redacted',
          duration: 2,
          responsibilities: []
        });
      }
    });

    return roles.slice(0, 5);
  }

  private estimateTotalYears(roles: ExperienceInfo['roles']): number {
    return roles.reduce((sum, role) => sum + role.duration, 0);
  }

  private extractEducation(text: string): EducationInfo {
    const degrees = {
      'phd': 'PhD',
      'doctorate': 'PhD',
      'master': 'Master',
      'mba': 'MBA',
      'bachelor': 'Bachelor',
      'associate': 'Associate',
      'diploma': 'Diploma'
    };

    let highestDegree = 'Unknown';
    for (const [pattern, degree] of Object.entries(degrees)) {
      if (text.includes(pattern)) {
        highestDegree = degree;
        break;
      }
    }

    const fields = [
      'computer science', 'engineering', 'business', 'mathematics',
      'data science', 'information technology', 'management'
    ];

    let field = 'Unknown';
    for (const f of fields) {
      if (text.includes(f)) {
        field = f;
        break;
      }
    }

    return {
      highestDegree,
      field,
      institution: 'Redacted'
    };
  }

  private extractCertifications(text: string): string[] {
    const certPatterns = [
      'aws certified', 'azure certified', 'gcp certified',
      'pmp', 'cissp', 'cisa', 'cism',
      'scrum master', 'product owner',
      'certified kubernetes', 'terraform associate'
    ];

    return certPatterns.filter(cert => text.includes(cert));
  }

  private generateSummary(text: string): string {
    const firstSentences = text.split('.').slice(0, 3).join('.');
    return firstSentences.substring(0, 200) + '...';
  }

  private applyPrivacyToSkills(skills: ExtractedSkill[]): ExtractedSkill[] {
    return skills.map(skill => ({
      ...skill,
      yearsExperience: Math.max(
        0,
        this.privacyManager.privateAggregation([skill.yearsExperience], 'mean')
      ),
      relevance: Math.min(
        100,
        Math.max(
          0,
          this.privacyManager.privateAggregation([skill.relevance], 'mean')
        )
      )
    }));
  }

  async matchAgainstJob(
    extractedData: ExtractedResumeData,
    jobRequirements: {
      requiredSkills: string[];
      preferredSkills: string[];
      minExperience: number;
      educationRequired: string;
    }
  ): Promise<MatchResult> {
    const candidateSkills = new Set(extractedData.skills.map(s => s.name.toLowerCase()));

    const requiredMatches: SkillMatch[] = jobRequirements.requiredSkills.map(skill => ({
      skill,
      required: true,
      found: candidateSkills.has(skill.toLowerCase()),
      proficiency: this.findSkillProficiency(extractedData.skills, skill),
      weight: 2.0
    }));

    const preferredMatches: SkillMatch[] = jobRequirements.preferredSkills.map(skill => ({
      skill,
      required: false,
      found: candidateSkills.has(skill.toLowerCase()),
      proficiency: this.findSkillProficiency(extractedData.skills, skill),
      weight: 1.0
    }));

    const allMatches = [...requiredMatches, ...preferredMatches];

    const skillScore = this.calculateSkillScore(allMatches);
    const experienceMatch = this.calculateExperienceMatch(
      extractedData.experience.totalYears,
      jobRequirements.minExperience
    );
    const educationMatch = this.calculateEducationMatch(
      extractedData.education.highestDegree,
      jobRequirements.educationRequired
    );

    const matchScore = Math.round(
      skillScore * 0.6 + experienceMatch * 0.25 + educationMatch * 0.15
    );

    const confidenceScore = this.calculateConfidence(extractedData, allMatches);

    const recommendations = this.generateMatchRecommendations(
      matchScore,
      allMatches,
      experienceMatch,
      educationMatch
    );

    return {
      matchScore,
      confidenceScore,
      skillMatches: allMatches,
      experienceMatch,
      educationMatch,
      recommendations
    };
  }

  private findSkillProficiency(skills: ExtractedSkill[], skillName: string): string {
    const skill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
    return skill?.proficiency || 'unknown';
  }

  private calculateSkillScore(matches: SkillMatch[]): number {
    let totalWeight = 0;
    let weightedScore = 0;

    matches.forEach(match => {
      totalWeight += match.weight;
      if (match.found) {
        weightedScore += match.weight * 100;
      }
    });

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  private calculateExperienceMatch(candidateYears: number, requiredYears: number): number {
    if (candidateYears >= requiredYears) {
      return 100;
    }
    if (candidateYears >= requiredYears * 0.8) {
      return 80;
    }
    if (candidateYears >= requiredYears * 0.6) {
      return 60;
    }
    return Math.min(50, (candidateYears / requiredYears) * 100);
  }

  private calculateEducationMatch(candidateDegree: string, requiredDegree: string): number {
    const degreeHierarchy: { [key: string]: number } = {
      'PhD': 5,
      'Master': 4,
      'MBA': 4,
      'Bachelor': 3,
      'Associate': 2,
      'Diploma': 1,
      'Unknown': 0
    };

    const candidateLevel = degreeHierarchy[candidateDegree] || 0;
    const requiredLevel = degreeHierarchy[requiredDegree] || 0;

    if (candidateLevel >= requiredLevel) {
      return 100;
    }
    if (candidateLevel >= requiredLevel - 1) {
      return 70;
    }
    return 40;
  }

  private calculateConfidence(data: ExtractedResumeData, matches: SkillMatch[]): number {
    let confidence = 50;

    if (data.skills.length >= 10) confidence += 20;
    else if (data.skills.length >= 5) confidence += 10;

    if (data.experience.totalYears > 0) confidence += 15;

    if (data.education.highestDegree !== 'Unknown') confidence += 10;

    const matchRate = matches.filter(m => m.found).length / matches.length;
    if (matchRate > 0.7) confidence += 5;

    return Math.min(100, confidence);
  }

  private generateMatchRecommendations(
    matchScore: number,
    skillMatches: SkillMatch[],
    experienceMatch: number,
    educationMatch: number
  ): string[] {
    const recommendations: string[] = [];

    if (matchScore >= 80) {
      recommendations.push('Strong candidate - recommend interview');
      recommendations.push('Skills align well with requirements');
    } else if (matchScore >= 60) {
      recommendations.push('Qualified candidate - consider for next round');

      const missingRequired = skillMatches.filter(m => m.required && !m.found);
      if (missingRequired.length > 0) {
        recommendations.push(`Missing ${missingRequired.length} required skill(s)`);
      }
    } else {
      recommendations.push('Below threshold - may need additional screening');
    }

    if (experienceMatch < 60) {
      recommendations.push('Experience level below requirements');
    }

    if (educationMatch < 70) {
      recommendations.push('Education level may not meet standards');
    }

    return recommendations;
  }

  getPrivacyReport() {
    return this.privacyManager.getPrivacyReport();
  }
}

export const nlpResumeProcessor = new NLPResumeProcessor();
