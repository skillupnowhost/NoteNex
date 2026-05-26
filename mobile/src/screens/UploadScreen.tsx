import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { supabase, allowedFileTypes, STORAGE_BUCKET, getShareMessage } from '../lib/supabase';
import { useEntrance, useIconPop, usePressAnim, usePulse } from '../lib/animations';

export default function UploadScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileInfo, setFileInfo] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  const headerEntrance = useEntrance(0, 18);
  const bannerEntrance = useEntrance(60, 14);
  const formEntrance = useEntrance(120, 16);

  const uploadBtnPress = usePressAnim(0.95);
  const uploadBtnPop = useIconPop(200);
  const shareBtnPress = usePressAnim(0.93);
  const filePickerPress = usePressAnim(0.97);
  const uploadPulse = usePulse(1, 1.03, 700);

  // File-selected bounce
  const fileBounce = useRef(new Animated.Value(1)).current;
  function bounceFile() {
    Animated.sequence([
      Animated.spring(fileBounce, { toValue: 1.06, friction: 4, useNativeDriver: true }),
      Animated.spring(fileBounce, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }

  // Status pop
  const statusPop = useRef(new Animated.Value(0)).current;
  function popStatus() {
    statusPop.setValue(0);
    Animated.spring(statusPop, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }

  // Progress bar animated width
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 300, useNativeDriver: false }).start();
  }, [progress]);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: allowedFileTypes, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > 250 * 1024 * 1024) {
      Alert.alert('File too large', 'File exceeds the 250MB limit.');
      return;
    }
    setFileInfo(asset);
    if (!title) setTitle(asset.name.replace(/\.[^/.]+$/, ''));
    setStatus('');
    setProgress(0);
    progressAnim.setValue(0);
    setDownloadUrl('');
    bounceFile();
  };

  const uploadFile = async () => {
    if (!user) { Alert.alert('Not signed in'); return; }
    if (!fileInfo?.uri) { Alert.alert('No file', 'Please choose a file first.'); return; }
    if (!title.trim()) { Alert.alert('Title required', 'Please enter a title for this file.'); return; }
    const institution = user.institution || 'unknown';
    const department = user.department || 'unknown';
    const year = user.year || 'unknown';
    try {
      setUploading(true);
      setStatus('Preparing…');
      const base64 = await FileSystem.readAsStringAsync(fileInfo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const arrayBuffer = bytes.buffer;
      const filePath = `${institution}/${department}/${year}/${Date.now()}-${fileInfo.name}`;

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, arrayBuffer, { contentType: fileInfo.mimeType || 'application/octet-stream' });
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      const link = urlData.publicUrl;

      const fileType = fileInfo.mimeType?.includes('pdf') ? 'pdf'
        : fileInfo.mimeType?.includes('image') ? 'image'
        : fileInfo.mimeType?.includes('presentation') ? 'presentation'
        : fileInfo.mimeType?.includes('sheet') || fileInfo.mimeType?.includes('excel') || fileInfo.mimeType?.includes('csv') ? 'spreadsheet'
        : 'document';

      const { error: dbError } = await supabase.from('materials').insert({
        title: title.trim() || fileInfo.name,
        description,
        category: 'resource',
        file_type: fileType,
        uploaded_by: user.email,
        department,
        year,
        institution,
        share_link: link,
      });
      if (dbError) throw dbError;

      setStatus('Upload complete!');
      setDownloadUrl(link);
      setUploading(false);
      setFileInfo(null);
      setTitle('');
      setDescription('');
      popStatus();
    } catch (err: any) {
      setStatus(err.message || 'Upload failed.');
      setUploading(false);
      popStatus();
    }
  };

  const shareLink = async () => {
    if (!downloadUrl) return;
    await Share.share({ message: getShareMessage(downloadUrl) });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.pageHeader, headerEntrance.style]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Upload</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Share resources with your department</Text>
      </Animated.View>

      <Animated.View style={[styles.infoBanner, { backgroundColor: colors.accentBg, borderColor: colors.border }, bannerEntrance.style]}>
        <BannerIcon color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Upload center</Text>
          <Text style={[styles.infoDesc, { color: colors.textMuted }]}>PDF, DOC, PPT, XLS, CSV, PNG, JPEG  ·  Max 250MB</Text>
        </View>
      </Animated.View>

      <Animated.View style={formEntrance.style}>
        {/* File Picker */}
        <Animated.View style={{ transform: [{ scale: Animated.multiply(filePickerPress.scale, fileBounce) }] }}>
          <Pressable
            style={[styles.filePicker, { backgroundColor: colors.card, borderColor: fileInfo ? colors.green : colors.border }]}
            onPress={pickDocument}
            onPressIn={filePickerPress.onPressIn}
            onPressOut={filePickerPress.onPressOut}
            disabled={uploading}
          >
            <FilePickerIcon fileInfo={fileInfo} colors={colors} />
            <Text style={[styles.filePickerText, { color: fileInfo ? colors.green : colors.textMuted }]} numberOfLines={1}>
              {fileInfo ? fileInfo.name : 'Choose a file to upload'}
            </Text>
            {fileInfo && <Ionicons name="checkmark-circle" size={18} color={colors.green} />}
          </Pressable>
        </Animated.View>

        <Text style={[styles.label, { color: colors.textMuted }]}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter a title for this file…"
          placeholderTextColor={colors.textSubtle}
          style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Add a short summary…"
          placeholderTextColor={colors.textSubtle}
          style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        />

        {/* Upload Button */}
        <Animated.View style={{ transform: [{ scale: Animated.multiply(uploadBtnPress.scale, uploading ? uploadPulse : uploadBtnPop) }] }}>
          <Pressable
            style={[styles.uploadBtn, { backgroundColor: colors.accent }, uploading && styles.disabled]}
            onPress={uploadFile}
            onPressIn={uploadBtnPress.onPressIn}
            onPressOut={uploadBtnPress.onPressOut}
            disabled={uploading}
          >
            <Ionicons name={uploading ? 'cloud-upload' : 'cloud-upload-outline'} size={19} color="#ffffff" />
            <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : 'Upload Document'}</Text>
          </Pressable>
        </Animated.View>

        {/* Progress Bar */}
        {uploading && progress > 0 && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) as any,
                    backgroundColor: colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSubtle }]}>{progress}%</Text>
          </View>
        )}

        {/* Status */}
        {!!status && (
          <Animated.View style={[
            styles.statusRow,
            {
              backgroundColor: status.includes('complete') ? colors.greenBg : colors.card,
              borderColor: colors.border,
              transform: [{ scale: statusPop }],
              opacity: statusPop,
            },
          ]}>
            <Ionicons
              name={status.includes('complete') ? 'checkmark-circle' : status.includes('fail') || status.includes('Failed') ? 'close-circle' : 'cloud-upload-outline'}
              size={15}
              color={status.includes('complete') ? colors.green : status.includes('fail') || status.includes('Failed') ? colors.red : colors.textSubtle}
            />
            <Text style={[styles.statusText, { color: status.includes('complete') ? colors.green : colors.textMuted }]}>{status}</Text>
          </Animated.View>
        )}

        {/* Share button */}
        {downloadUrl ? (
          <Animated.View style={{ transform: [{ scale: shareBtnPress.scale }] }}>
            <Pressable
              style={[styles.shareBtn, { borderColor: colors.accent, backgroundColor: colors.accentBg }]}
              onPress={shareLink}
              onPressIn={shareBtnPress.onPressIn}
              onPressOut={shareBtnPress.onPressOut}
            >
              <Ionicons name="share-social-outline" size={17} color={colors.accent} />
              <Text style={[styles.shareText, { color: colors.accent }]}>Share upload link</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}

function BannerIcon({ color }: { color: string }) {
  const pop = useIconPop(180);
  return (
    <Animated.View style={{ transform: [{ scale: pop }] }}>
      <Ionicons name="cloud-upload-outline" size={26} color={color} />
    </Animated.View>
  );
}

function FilePickerIcon({ fileInfo, colors }: { fileInfo: DocumentPicker.DocumentPickerAsset | null; colors: any }) {
  const pop = useIconPop(80);
  return (
    <Animated.View style={{ transform: [{ scale: pop }] }}>
      <Ionicons name={fileInfo ? 'document-attach' : 'attach-outline'} size={20} color={fileInfo ? colors.green : colors.accent} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20 },
  pageHeader: { marginBottom: 18 },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 3 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 20 },
  infoTitle: { fontSize: 14, fontWeight: '700' },
  infoDesc: { fontSize: 12, marginTop: 2 },
  filePicker: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 16 },
  filePickerText: { flex: 1, fontSize: 13 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 7 },
  textInput: { borderRadius: 13, padding: 13, fontSize: 14, borderWidth: 1, marginBottom: 18 },
  textArea: { borderRadius: 13, padding: 13, minHeight: 90, fontSize: 14, lineHeight: 21, textAlignVertical: 'top', borderWidth: 1, marginBottom: 18 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, borderRadius: 13, marginBottom: 14 },
  uploadBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.7 },
  progressWrap: { marginBottom: 12 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, textAlign: 'right' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 11, padding: 12, marginBottom: 12, borderWidth: 1 },
  statusText: { fontSize: 13 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  shareText: { fontWeight: '700', fontSize: 14 },
});
