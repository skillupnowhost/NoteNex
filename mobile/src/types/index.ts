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
  groupId?: string;
  groupName?: string;
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
  allowedFormats: string[];
  maxScore?: number;
  scoresVisible: boolean;
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
  postedBy?: string;
  allowedFormats: string[];
  maxScore?: number;
  scoresVisible: boolean;
}

export interface CommentItem {
  id: string;
  materialId: string;
  text: string;
  commentedBy: string;
  createdAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  text: string;
  senderEmail: string;
  senderName: string;
  type: 'text' | 'file';
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId?: string;
  projectId?: string;
  studentEmail: string;
  studentName: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  submittedAt: string;
  institution: string;
  department: string;
  year: string;
  status: 'submitted' | 'graded' | 'late';
  score?: number;
  feedback?: string;
}
