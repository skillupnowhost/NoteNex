import { supabase } from './supabase';
import { AssignmentItem, CommentItem, GroupMessage, MaterialItem, ProjectItem, Submission } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  description: string;
  institution: string;
  department: string;
  category: 'UG' | 'PG' | 'Other';
  createdBy: string;
  admins: string[];
  members: string[];
  isPublic: boolean;
  createdAt: any;
}

export type EventType = 'Exam' | 'Assignment' | 'Project' | 'Seminar' | 'Workshop' | 'Holiday' | 'Other';
export type Semester = 'Sem 1' | 'Sem 2' | 'Sem 3' | 'Sem 4' | 'Sem 5' | 'Sem 6' | 'Sem 7' | 'Sem 8' | 'All';

export interface CampusEvent {
  id: string;
  title: string;
  type: EventType;
  description: string;
  dueDate: string;
  institution: string;
  department: string;
  semester: Semester;
  groupId?: string;
  groupName?: string;
  createdBy: string;
  tags: string[];
  createdAt: any;
}

// ─── Materials ───────────────────────────────────────────────────────────────

export async function fetchMaterials(institution: string, department: string, year: string): Promise<MaterialItem[]> {
  const { data } = await supabase
    .from('materials')
    .select('*')
    .eq('institution', institution)
    .eq('department', department)
    .eq('year', year)
    .order('uploaded_at', { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    category: row.category ?? 'resource',
    fileType: row.file_type ?? 'document',
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by ?? '',
    department: row.department ?? '',
    year: row.year ?? '',
    institution: row.institution ?? '',
    shareLink: row.share_link ?? '',
    groupId: row.group_id ?? undefined,
    groupName: row.group_name ?? undefined,
  })) as MaterialItem[];
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMaterialsByGroup(groupId: string): Promise<MaterialItem[]> {
  const { data } = await supabase
    .from('materials')
    .select('*')
    .eq('group_id', groupId)
    .order('uploaded_at', { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    category: row.category ?? 'resource',
    fileType: row.file_type ?? 'document',
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by ?? '',
    department: row.department ?? '',
    year: row.year ?? '',
    institution: row.institution ?? '',
    shareLink: row.share_link ?? '',
    groupId: row.group_id ?? undefined,
    groupName: row.group_name ?? undefined,
  })) as MaterialItem[];
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export async function fetchAssignments(institution: string, department: string, year: string): Promise<AssignmentItem[]> {
  const { data } = await supabase
    .from('assignments')
    .select('*')
    .eq('institution', institution)
    .eq('department', department)
    .eq('year', year)
    .order('due_date', { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    dueDate: row.due_date ?? new Date().toISOString(),
    createdAt: row.created_at,
    department: row.department ?? '',
    year: row.year ?? '',
    institution: row.institution ?? '',
    postedBy: row.posted_by ?? '',
    allowedFormats: row.allowed_formats ?? [],
    maxScore: row.max_score ?? undefined,
    scoresVisible: row.scores_visible ?? false,
  })) as AssignmentItem[];
}

export async function toggleAssignmentScores(id: string, visible: boolean): Promise<void> {
  const { error } = await supabase.from('assignments').update({ scores_visible: visible }).eq('id', id);
  if (error) throw error;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function fetchProjects(institution: string, department: string, year: string): Promise<ProjectItem[]> {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('institution', institution)
    .eq('department', department)
    .eq('year', year)
    .order('deadline', { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? '',
    summary: row.summary ?? '',
    deadline: row.deadline ?? new Date().toISOString(),
    status: row.status ?? 'planned',
    institution: row.institution ?? '',
    department: row.department ?? '',
    year: row.year ?? '',
    postedBy: row.posted_by ?? undefined,
    allowedFormats: row.allowed_formats ?? [],
    maxScore: row.max_score ?? undefined,
    scoresVisible: row.scores_visible ?? false,
  })) as ProjectItem[];
}

export async function toggleProjectScores(id: string, visible: boolean): Promise<void> {
  const { error } = await supabase.from('projects').update({ scores_visible: visible }).eq('id', id);
  if (error) throw error;
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export async function fetchUserGroups(email: string, institution: string): Promise<Group[]> {
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('institution', institution)
    .contains('members', [email]);
  return (data ?? []).map(mapGroup);
}

export async function fetchPublicGroups(institution: string, department: string): Promise<Group[]> {
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('institution', institution)
    .eq('department', department)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapGroup);
}

function mapGroup(row: any): Group {
  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? '',
    institution: row.institution ?? '',
    department: row.department ?? '',
    category: row.category ?? 'Other',
    createdBy: row.created_by ?? '',
    admins: row.admins ?? [],
    members: (row.members ?? []).filter(Boolean),
    isPublic: row.is_public ?? false,
    createdAt: row.created_at,
  };
}

export async function createGroup(data: Omit<Group, 'id' | 'createdAt'>): Promise<Group> {
  const { data: row, error } = await supabase
    .from('groups')
    .insert({
      name: data.name,
      description: data.description,
      institution: data.institution,
      department: data.department,
      category: data.category,
      created_by: data.createdBy,
      admins: data.admins,
      members: data.members,
      is_public: data.isPublic,
    })
    .select()
    .single();
  if (error) throw error;
  return mapGroup(row);
}

export async function inviteMemberToGroup(groupId: string, email: string): Promise<void> {
  const { data: group, error: fetchError } = await supabase
    .from('groups')
    .select('members')
    .eq('id', groupId)
    .single();
  if (fetchError) throw fetchError;
  const members = [...(group.members ?? []), email.trim().toLowerCase()];
  const { error } = await supabase.from('groups').update({ members }).eq('id', groupId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function fetchComments(materialId: string): Promise<CommentItem[]> {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('material_id', materialId)
    .order('created_at', { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id,
    materialId: row.material_id,
    text: row.text,
    commentedBy: row.commented_by,
    createdAt: row.created_at,
  })) as CommentItem[];
}

export async function addComment(materialId: string, text: string, commentedBy: string): Promise<void> {
  const { error } = await supabase.from('comments').insert({
    material_id: materialId,
    text,
    commented_by: commentedBy,
  });
  if (error) throw error;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function fetchEvents(institution: string, department: string): Promise<CampusEvent[]> {
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('institution', institution)
    .eq('department', department)
    .order('due_date', { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    description: row.description,
    dueDate: row.due_date,
    institution: row.institution,
    department: row.department,
    semester: row.semester,
    groupId: row.group_id,
    groupName: row.group_name,
    createdBy: row.created_by,
    tags: row.tags ?? [],
    createdAt: row.created_at,
  })) as CampusEvent[];
}

export async function createEvent(data: Omit<CampusEvent, 'id' | 'createdAt'>): Promise<string> {
  const { data: row, error } = await supabase
    .from('events')
    .insert({
      title: data.title,
      type: data.type,
      description: data.description,
      due_date: data.dueDate,
      institution: data.institution,
      department: data.department,
      semester: data.semester,
      group_id: data.groupId,
      group_name: data.groupName,
      created_by: data.createdBy,
      tags: data.tags,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}

// ─── Group Messages ───────────────────────────────────────────────────────────

function mapMessage(row: any): GroupMessage {
  return {
    id: row.id,
    groupId: row.group_id,
    text: row.text ?? '',
    senderEmail: row.sender_email ?? '',
    senderName: row.sender_name ?? '',
    type: row.type ?? 'text',
    fileUrl: row.file_url ?? undefined,
    fileName: row.file_name ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const { data } = await supabase
    .from('group_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data ?? []).map(mapMessage);
}

export async function sendGroupMessage(
  groupId: string,
  text: string,
  senderEmail: string,
  senderName: string,
  file?: { url: string; name: string; fileType: string },
): Promise<GroupMessage> {
  const { data, error } = await supabase
    .from('group_messages')
    .insert({
      group_id: groupId,
      text,
      sender_email: senderEmail,
      sender_name: senderName,
      type: file ? 'file' : 'text',
      file_url: file?.url ?? null,
      file_name: file?.name ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapMessage(data);
}

// ─── Create Assignment / Project ──────────────────────────────────────────────

export async function createAssignment(data: {
  title: string; description: string; dueDate: string;
  institution: string; department: string; year: string;
  postedBy: string; allowedFormats: string[]; maxScore?: number;
}): Promise<void> {
  const { error } = await supabase.from('assignments').insert({
    title: data.title, description: data.description,
    due_date: new Date(data.dueDate).toISOString(),
    institution: data.institution, department: data.department, year: data.year,
    posted_by: data.postedBy, allowed_formats: data.allowedFormats,
    max_score: data.maxScore ?? null, scores_visible: false,
  });
  if (error) throw error;
}

export async function createProject(data: {
  title: string; summary: string; deadline: string;
  status: 'planned' | 'active'; institution: string;
  department: string; year: string; postedBy: string;
  allowedFormats: string[]; maxScore?: number;
}): Promise<void> {
  const { error } = await supabase.from('projects').insert({
    title: data.title, summary: data.summary,
    deadline: new Date(data.deadline).toISOString(),
    status: data.status, institution: data.institution,
    department: data.department, year: data.year,
    posted_by: data.postedBy, allowed_formats: data.allowedFormats,
    max_score: data.maxScore ?? null, scores_visible: false,
  });
  if (error) throw error;
}

// ─── Submissions ──────────────────────────────────────────────────────────────

function mapSubmission(row: any): Submission {
  return {
    id: row.id,
    assignmentId: row.assignment_id ?? undefined,
    projectId: row.project_id ?? undefined,
    studentEmail: row.student_email ?? '',
    studentName: row.student_name ?? '',
    fileUrl: row.file_url ?? '',
    fileName: row.file_name ?? '',
    fileType: row.file_type ?? 'document',
    submittedAt: row.submitted_at,
    institution: row.institution ?? '',
    department: row.department ?? '',
    year: row.year ?? '',
    status: row.status ?? 'submitted',
    score: row.score ?? undefined,
    feedback: row.feedback ?? undefined,
  };
}

export async function submitWork(data: {
  assignmentId?: string; projectId?: string;
  studentEmail: string; studentName: string;
  fileUrl: string; fileName: string; fileType: string;
  institution: string; department: string; year: string;
  isLate: boolean;
}): Promise<void> {
  const { error } = await supabase.from('submissions').insert({
    assignment_id: data.assignmentId ?? null,
    project_id: data.projectId ?? null,
    student_email: data.studentEmail,
    student_name: data.studentName,
    file_url: data.fileUrl,
    file_name: data.fileName,
    file_type: data.fileType,
    institution: data.institution,
    department: data.department,
    year: data.year,
    status: data.isLate ? 'late' : 'submitted',
  });
  if (error) throw error;
}

export async function fetchSubmissions(
  type: 'assignment' | 'project',
  itemId: string,
): Promise<Submission[]> {
  const col = type === 'assignment' ? 'assignment_id' : 'project_id';
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq(col, itemId)
    .order('submitted_at', { ascending: false });
  return (data ?? []).map(mapSubmission);
}

export async function fetchMySubmission(
  type: 'assignment' | 'project',
  itemId: string,
  studentEmail: string,
): Promise<Submission | null> {
  const col = type === 'assignment' ? 'assignment_id' : 'project_id';
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq(col, itemId)
    .eq('student_email', studentEmail)
    .maybeSingle();
  return data ? mapSubmission(data) : null;
}

// ─── Countdown helper ─────────────────────────────────────────────────────────

export function getCountdown(dueDate: string): { text: string; overdue: boolean; urgent: boolean } {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  if (diff < 0) return { text: 'Overdue', overdue: true, urgent: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return { text: `${days}d ${hours}h left`, overdue: false, urgent: days <= 2 };
  if (hours > 0) return { text: `${hours}h ${mins}m left`, overdue: false, urgent: true };
  return { text: `${mins}m left`, overdue: false, urgent: true };
}
