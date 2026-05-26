import { supabase } from './supabase';
import { AssignmentItem, MaterialItem, ProjectItem } from '../types';

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

// ─── Materials / Assignments / Projects ──────────────────────────────────────

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
    title: row.title,
    description: row.description,
    category: row.category,
    fileType: row.file_type,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by,
    department: row.department,
    year: row.year,
    institution: row.institution,
    shareLink: row.share_link,
  })) as MaterialItem[];
}

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
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    createdAt: row.created_at,
    department: row.department,
    year: row.year,
    institution: row.institution,
    postedBy: row.posted_by,
  })) as AssignmentItem[];
}

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
    title: row.title,
    summary: row.summary,
    deadline: row.deadline,
    status: row.status,
    institution: row.institution,
    department: row.department,
    year: row.year,
  })) as ProjectItem[];
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export async function fetchUserGroups(email: string, institution: string): Promise<Group[]> {
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('institution', institution)
    .contains('members', [email]);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    institution: row.institution,
    department: row.department,
    category: row.category,
    createdBy: row.created_by,
    admins: row.admins ?? [],
    members: row.members ?? [],
    isPublic: row.is_public,
    createdAt: row.created_at,
  })) as Group[];
}

export async function createGroup(data: Omit<Group, 'id' | 'createdAt'>): Promise<string> {
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
    .select('id')
    .single();
  if (error) throw error;
  return row.id;
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
