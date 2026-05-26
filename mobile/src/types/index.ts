export type UserRole = 'student' | 'admin' | 'professor' | 'hod' | 'principal';

export interface CampusUser {
  uid: string;
  email: string;
  studentName: string;
  institution: string;
  institutionName: string;
  collegeName: string;
  boardOrUniversity: string;
  studentId: string;
  department: string;
  year: string;
  role: UserRole;
  securityLevel: string;
  photoURL?: string;
}

export interface MaterialItem {
  id: string;
  title: string;
  description: string;
  category: 'lecture' | 'assignment' | 'project' | 'resource';
  fileType: 'pdf' | 'document' | 'presentation' | 'spreadsheet' | 'image';
  uploadedAt: number;
  uploadedBy: string;
  department: string;
  year: string;
  institution: string;
  shareLink: string;
}

export interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: number;
  department: string;
  year: string;
  institution: string;
  postedBy: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  summary: string;
  deadline: string;
  status: 'planned' | 'active' | 'completed';
  institution: string;
  department: string;
  year: string;
}
