import React, { useState, useEffect, useRef } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Paper, Slider, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import { Edit as EditIcon, Close as CloseIcon, Upload as UploadIcon } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { schoolPageService } from '../services/schoolPage';
import SchoolPostFeed from '../components/SchoolPageComponents/SchoolPostFeed';
import Layout from '../components/Layout';

export default function SchoolPageProfile() {
  const { schoolId: routeSchoolId } = useParams();
  const { user } = useAuth();

  // Resolve schoolId from route, falling back to logged-in user's school
  const schoolId = routeSchoolId || user?.schoolId || user?.school_id;
  const isSchoolAdmin = user?.role === 'school_admin' && (user?.schoolId === schoolId || user?.school_id == schoolId);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerFilter, setBannerFilter] = useState('none');
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 }); // in preview image-box px
  const [cropActive, setCropActive] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoFilter, setLogoFilter] = useState('none');
  const [previewSizeLogo, setPreviewSizeLogo] = useState({ width: 0, height: 0 });
  const [imageSizeLogo, setImageSizeLogo] = useState({ width: 0, height: 0 });
  const [cropRectLogo, setCropRectLogo] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropActiveLogo, setCropActiveLogo] = useState(false);
  const [formData, setFormData] = useState({
    banner_url: '',
    logo_url: '',
    description: '',
    vision_statement: '',
    allow_comments: true,
    require_follow_approval: false
  });

  const bannerInputRef = useRef(null);
  const previewRef = useRef(null);
  const dragState = useRef({ active: false, type: 'none', startX: 0, startY: 0, startRect: { x: 0, y: 0, width: 0, height: 0 } });
  const logoInputRef = useRef(null);
  const previewRefLogo = useRef(null);
  const dragStateLogo = useRef({ active: false, type: 'none', startX: 0, startY: 0, startRect: { x: 0, y: 0, width: 0, height: 0 } });

  const displaySchoolName = profile?.school_name || user?.schoolName || user?.school_name || 'School Name';

  // Load profile when schoolId is available
  useEffect(() => {
    if (!schoolId) return;
    loadProfile();
  }, [schoolId]);

  const loadProfile = async () => {
    try {
      if (!schoolId) {
        throw new Error('School ID is missing');
      }
      setLoading(true);
      const page = await schoolPageService.getProfile(schoolId);
      if (!page) throw new Error('No page found');
      setProfile(page);
      setFormData({
        banner_url: page.banner_url || '',
        logo_url: page.logo_url || '',
        description: page.description || '',
        vision_statement: page.vision_statement || '',
        allow_comments: page.allow_comments !== false,
        require_follow_approval: page.require_follow_approval === true
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load school page');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = () => {
    setEditModalOpen(true);
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const triggerBannerSelect = () => {
    if (bannerInputRef.current) bannerInputRef.current.click();
  };

  const triggerLogoSelect = () => {
    if (logoInputRef.current) logoInputRef.current.click();
  };

  const handleBannerFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result);
      setBannerFilter('none');
      setCropActive(true);
      // Load natural image size
      const img = new Image();
      img.onload = () => setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      setLogoFilter('none');
      setCropActiveLogo(true);
      const img = new Image();
      img.onload = () => setImageSizeLogo({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const filterMap = {
    none: 'none',
    grayscale: 'grayscale(1)',
    sepia: 'sepia(0.6)',
    contrast: 'contrast(1.25)',
    brightness: 'brightness(1.1)',
    saturate: 'saturate(1.3)'
  };

  const filterOptions = [
    { key: 'none', label: 'None' },
    { key: 'grayscale', label: 'Grayscale' },
    { key: 'sepia', label: 'Sepia' },
    { key: 'contrast', label: 'Contrast' },
    { key: 'brightness', label: 'Bright' },
    { key: 'saturate', label: 'Saturate' }
  ];

  const processBannerImage = (src, filterKey, cropRectArg, previewSizeArg, imageSizeArg) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const targetW = 1600;
        const targetH = 600;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        const natW = imageSizeArg?.width || img.width;
        const natH = imageSizeArg?.height || img.height;
        const scale = Math.min(previewSizeArg.width / natW, previewSizeArg.height / natH);
        const sx = cropRectArg.x / scale;
        const sy = cropRectArg.y / scale;
        const sWidth = cropRectArg.width / scale;
        const sHeight = cropRectArg.height / scale;
        ctx.filter = filterMap[filterKey] || 'none';
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = reject;
      img.src = src;
    });

  const handleSaveBanner = async () => {
    if (!bannerPreview) return;
    try {
      setBannerUploading(true);
      updatePreviewSize();
      const effectiveRect = (cropRect && cropRect.width && cropRect.height) ? cropRect : getDefaultCropRect();
      const processed = await processBannerImage(bannerPreview, bannerFilter, effectiveRect, previewSize, imageSize);
      const updatedPage = await schoolPageService.updateProfile({ banner_url: processed });
      if (updatedPage) {
        setProfile(updatedPage);
        setFormData((prev) => ({
          ...prev,
          banner_url: updatedPage.banner_url || processed
        }));
      } else {
        await loadProfile();
      }
      setBannerPreview(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update banner');
    } finally {
      setBannerUploading(false);
    }
  };

  const updatePreviewSize = () => {
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      setPreviewSize({ width: rect.width, height: rect.height });
    }
  };

  useEffect(() => {
    if (!bannerPreview) return undefined;
    updatePreviewSize();
    window.addEventListener('resize', updatePreviewSize);
    return () => window.removeEventListener('resize', updatePreviewSize);
  }, [bannerPreview]);

  const getPoint = (e) => {
    if ('touches' in e && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const getImageBox = () => {
    const natW = imageSize.width;
    const natH = imageSize.height;
    const contW = previewSize.width;
    const contH = previewSize.height;
    if (!natW || !natH || !contW || !contH) return { x: 0, y: 0, width: 0, height: 0, scale: 1 };
    const scale = Math.min(contW / natW, contH / natH);
    const dispW = natW * scale;
    const dispH = natH * scale;
    const offsetX = (contW - dispW) / 2;
    const offsetY = (contH - dispH) / 2;
    return { x: offsetX, y: offsetY, width: dispW, height: dispH, scale };
  };

  const bannerAspect = 1600 / 600;
  const logoAspect = 1;

  const initCropToImageBox = () => {
    const box = getImageBox();
    if (!box.width || !box.height) return;
    let w = box.width;
    let h = w / bannerAspect;
    if (h > box.height) {
      h = box.height;
      w = h * bannerAspect;
    }
    const x = (box.width - w) / 2;
    const y = (box.height - h) / 2;
    setCropRect({ x, y, width: w, height: h });
  };

  const getDefaultCropRect = () => {
    const box = getImageBox();
    if (!box.width || !box.height) return { x: 0, y: 0, width: 0, height: 0 };
    let w = box.width;
    let h = w / bannerAspect;
    if (h > box.height) {
      h = box.height;
      w = h * bannerAspect;
    }
    const x = (box.width - w) / 2;
    const y = (box.height - h) / 2;
    return { x, y, width: w, height: h };
  };

  const getImageBoxLogo = () => {
    const natW = imageSizeLogo.width;
    const natH = imageSizeLogo.height;
    const contW = previewSizeLogo.width;
    const contH = previewSizeLogo.height;
    if (!natW || !natH || !contW || !contH) return { x: 0, y: 0, width: 0, height: 0, scale: 1 };
    const scale = Math.min(contW / natW, contH / natH);
    const dispW = natW * scale;
    const dispH = natH * scale;
    const offsetX = (contW - dispW) / 2;
    const offsetY = (contH - dispH) / 2;
    return { x: offsetX, y: offsetY, width: dispW, height: dispH, scale };
  };

  const initCropToImageBoxLogo = () => {
    const box = getImageBoxLogo();
    if (!box.width || !box.height) return;
    let w = box.width;
    let h = w / logoAspect;
    if (h > box.height) {
      h = box.height;
      w = h * logoAspect;
    }
    const x = (box.width - w) / 2;
    const y = (box.height - h) / 2;
    setCropRectLogo({ x, y, width: w, height: h });
  };

  const handleActivateCrop = () => {
    if (!cropActive) setCropActive(true);
    if (!cropRect.width || !cropRect.height) initCropToImageBox();
  };

  useEffect(() => {
    if (!bannerPreview) return;
    updatePreviewSize();
  }, [bannerPreview]);

  useEffect(() => {
    if (!bannerPreview) return;
    initCropToImageBox();
  }, [previewSize.width, previewSize.height, imageSize.width, imageSize.height]);

  const startDrag = (type, e) => {
    if (!bannerPreview) return;
    const rect = previewRef.current?.getBoundingClientRect();
    const box = getImageBox();
    const p = getPoint(e);
    const px = p.x - (rect?.left || 0) - box.x;
    const py = p.y - (rect?.top || 0) - box.y;
    dragState.current = { active: true, type, startX: px, startY: py, startRect: cropRect };
  };

  const startDragLogo = (type, e) => {
    if (!logoPreview) return;
    const rect = previewRefLogo.current?.getBoundingClientRect();
    const box = getImageBoxLogo();
    const p = getPoint(e);
    const px = p.x - (rect?.left || 0) - box.x;
    const py = p.y - (rect?.top || 0) - box.y;
    dragStateLogo.current = { active: true, type, startX: px, startY: py, startRect: cropRectLogo };
  };

  const endDrag = () => {
    dragState.current = { ...dragState.current, active: false };
  };

  const endDragLogo = () => {
    dragStateLogo.current = { ...dragStateLogo.current, active: false };
  };

  const handleDrag = (e) => {
    if (!dragState.current.active || !previewRef.current) return;
    e.preventDefault();
    const rect = previewRef.current.getBoundingClientRect();
    const box = getImageBox();
    const p = getPoint(e);
    const px = p.x - rect.left - box.x;
    const py = p.y - rect.top - box.y;
    const dx = px - dragState.current.startX;
    const dy = py - dragState.current.startY;
    const s = dragState.current.startRect;
    const minSize = 40;
    let next = { ...s };
    if (dragState.current.type === 'move') {
      next.x = clamp(s.x + dx, 0, box.width - s.width);
      next.y = clamp(s.y + dy, 0, box.height - s.height);
    } else {
      // Corner resize with fixed aspect
      const useX = Math.abs(dx) >= Math.abs(dy);
      const aspect = bannerAspect;
      if (dragState.current.type === 'nw') {
        let w = clamp(s.width - (useX ? dx : dy * aspect), minSize, box.width);
        let h = w / aspect;
        w = Math.min(w, s.x + s.width);
        h = Math.min(h, s.y + s.height);
        next.width = w;
        next.height = h;
        next.x = s.x + (s.width - w);
        next.y = s.y + (s.height - h);
      }
      if (dragState.current.type === 'ne') {
        let w = clamp(s.width + (useX ? dx : dy * aspect), minSize, box.width - s.x);
        let h = w / aspect;
        next.width = w;
        next.height = h;
        next.x = s.x;
        next.y = clamp(s.y + (s.height - h), 0, box.height - h);
      }
      if (dragState.current.type === 'sw') {
        let w = clamp(s.width - (useX ? dx : dy * aspect), minSize, box.width);
        let h = w / aspect;
        w = Math.min(w, s.x + s.width);
        next.width = w;
        next.height = h;
        next.x = s.x + (s.width - w);
        next.y = s.y;
      }
      if (dragState.current.type === 'se') {
        let w = clamp(s.width + (useX ? dx : dy * aspect), minSize, box.width - s.x);
        let h = w / aspect;
        next.width = w;
        next.height = h;
        next.x = s.x;
        next.y = s.y;
      }
      // Clamp inside image box
      next.x = clamp(next.x, 0, box.width - next.width);
      next.y = clamp(next.y, 0, box.height - next.height);
    }
    setCropRect(next);
  };

  const handleDragLogo = (e) => {
    if (!dragStateLogo.current.active || !previewRefLogo.current) return;
    e.preventDefault();
    const rect = previewRefLogo.current.getBoundingClientRect();
    const box = getImageBoxLogo();
    const p = getPoint(e);
    const px = p.x - rect.left - box.x;
    const py = p.y - rect.top - box.y;
    const dx = px - dragStateLogo.current.startX;
    const dy = py - dragStateLogo.current.startY;
    const s = dragStateLogo.current.startRect;
    const minSize = 40;
    let next = { ...s };
    if (dragStateLogo.current.type === 'move') {
      next.x = clamp(s.x + dx, 0, box.width - s.width);
      next.y = clamp(s.y + dy, 0, box.height - s.height);
    } else {
      const useX = Math.abs(dx) >= Math.abs(dy);
      const aspect = logoAspect;
      if (dragStateLogo.current.type === 'nw') {
        let w = clamp(s.width - (useX ? dx : dy * aspect), minSize, box.width);
        let h = w / aspect;
        w = Math.min(w, s.x + s.width);
        h = Math.min(h, s.y + s.height);
        next.width = w;
        next.height = h;
        next.x = s.x + (s.width - w);
        next.y = s.y + (s.height - h);
      }
      if (dragStateLogo.current.type === 'ne') {
        let w = clamp(s.width + (useX ? dx : dy * aspect), minSize, box.width - s.x);
        let h = w / aspect;
        next.width = w;
        next.height = h;
        next.x = s.x;
        next.y = clamp(s.y + (s.height - h), 0, box.height - h);
      }
      if (dragStateLogo.current.type === 'sw') {
        let w = clamp(s.width - (useX ? dx : dy * aspect), minSize, box.width);
        let h = w / aspect;
        w = Math.min(w, s.x + s.width);
        next.width = w;
        next.height = h;
        next.x = s.x + (s.width - w);
        next.y = s.y;
      }
      if (dragStateLogo.current.type === 'se') {
        let w = clamp(s.width + (useX ? dx : dy * aspect), minSize, box.width - s.x);
        let h = w / aspect;
        next.width = w;
        next.height = h;
        next.x = s.x;
        next.y = s.y;
      }
      next.x = clamp(next.x, 0, box.width - next.width);
      next.y = clamp(next.y, 0, box.height - next.height);
    }
    setCropRectLogo(next);
  };

  const nudgeCropLogo = (dx, dy) => {
    const box = getImageBoxLogo();
    if (!box.width || !box.height) return;
    const next = {
      x: clamp(cropRectLogo.x + dx, 0, box.width - cropRectLogo.width),
      y: clamp(cropRectLogo.y + dy, 0, box.height - cropRectLogo.height),
      width: cropRectLogo.width,
      height: cropRectLogo.height
    };
    setCropRectLogo(next);
  };

  const handleKeyDownLogo = (e) => {
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        nudgeCropLogo(-step, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        nudgeCropLogo(step, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        nudgeCropLogo(0, -step);
        break;
      case 'ArrowDown':
        e.preventDefault();
        nudgeCropLogo(0, step);
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        initCropToImageBoxLogo();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (cropActiveLogo) {
      setTimeout(() => {
        previewRefLogo.current?.focus?.();
      }, 0);
    }
  }, [cropActiveLogo]);

  const processLogoImage = (src, filterKey, cropRectArg, previewSizeArg, imageSizeArg) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const targetW = 400;
        const targetH = 400;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
        const natW = imageSizeArg?.width || img.width;
        const natH = imageSizeArg?.height || img.height;
        const scale = Math.min(previewSizeArg.width / natW, previewSizeArg.height / natH);
        const sx = cropRectArg.x / scale;
        const sy = cropRectArg.y / scale;
        const sWidth = cropRectArg.width / scale;
        const sHeight = cropRectArg.height / scale;
        ctx.filter = filterMap[filterKey] || 'none';
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });

  const updatePreviewSizeLogo = () => {
    if (previewRefLogo.current) {
      const rect = previewRefLogo.current.getBoundingClientRect();
      setPreviewSizeLogo({ width: rect.width, height: rect.height });
    }
  };

  const handleSaveLogo = async () => {
    if (!logoPreview) return;
    try {
      setLogoUploading(true);
      updatePreviewSizeLogo();
      const effectiveRect = (cropRectLogo && cropRectLogo.width && cropRectLogo.height) ? cropRectLogo : (() => {
        const box = getImageBoxLogo();
        let w = box.width;
        let h = w / logoAspect;
        if (h > box.height) { h = box.height; w = h * logoAspect; }
        const x = (box.width - w) / 2;
        const y = (box.height - h) / 2;
        return { x, y, width: w, height: h };
      })();
      const processed = await processLogoImage(logoPreview, logoFilter, effectiveRect, previewSizeLogo, imageSizeLogo);
      const updatedPage = await schoolPageService.updateProfile({ logo_url: processed });
      if (updatedPage) {
        setProfile(updatedPage);
        setFormData((prev) => ({ ...prev, logo_url: updatedPage.logo_url || processed }));
      } else {
        await loadProfile();
      }
      setLogoPreview(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const nudgeCrop = (dx, dy) => {
    const box = getImageBox();
    if (!box.width || !box.height) return;
    const next = {
      x: clamp(cropRect.x + dx, 0, box.width - cropRect.width),
      y: clamp(cropRect.y + dy, 0, box.height - cropRect.height),
      width: cropRect.width,
      height: cropRect.height
    };
    setCropRect(next);
  };

  const handleKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        nudgeCrop(-step, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        nudgeCrop(step, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        nudgeCrop(0, -step);
        break;
      case 'ArrowDown':
        e.preventDefault();
        nudgeCrop(0, step);
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        initCropToImageBox();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (cropActive) {
      setTimeout(() => {
        previewRef.current?.focus?.();
      }, 0);
    }
  }, [cropActive]);

  const handleImageUpload = (event, field) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, [field]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      console.log('💾 Saving profile with formData:', {
        banner_url: formData.banner_url?.substring(0, 50) + '...',
        logo_url: formData.logo_url?.substring(0, 50) + '...',
        description: formData.description,
        vision_statement: formData.vision_statement
      });
      await schoolPageService.updateProfile(formData);
      console.log('✅ Profile save successful, loading profile...');
      setEditModalOpen(false);
      // Auto-refresh profile and page
      await loadProfile();
      setError(null);
    } catch (err) {
      console.error('❌ Profile save error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowClick = async () => {
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await schoolPageService.unfollowSchool(schoolId);
      } else {
        await schoolPageService.followSchool(schoolId);
      }
      setIsFollowing(!isFollowing);
      await loadProfile(); // Refresh follower count
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout>
    <Box sx={{
      mx: { xs: -2, sm: -3 },
      mt: { xs: -2, sm: -3 },
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {error && <Alert severity="error" sx={{ mb: 2, mt: 2, fontSize: { xs: '0.85rem', sm: '1rem' } }}>{error}</Alert>}

      {/* Facebook-like Header Section */}
      <Paper sx={{ 
        mb: 0,
        overflow: 'hidden', 
        borderRadius: 0,
        boxShadow: 'none',
        bgcolor: 'background.paper'
      }}>
        {/* Banner with Cover Image */}
        <Box
          sx={{
            height: { xs: 180, sm: 240, md: 320, lg: 380 },
            backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: { xs: '12px', sm: '16px', md: '20px' },
            boxShadow: { xs: '0 1px 4px rgba(0,0,0,0.1)', md: '0 2px 8px rgba(0,0,0,0.1)' }
          }}
        >
          {isSchoolAdmin && (
            <>
              <Button
                startIcon={<EditIcon sx={{ fontSize: { xs: '18px', sm: '20px' } }} />}
                onClick={triggerBannerSelect}
                sx={{
                  position: 'absolute',
                  right: { xs: 12, sm: 16, md: 20 },
                  top: { xs: 12, sm: 16, md: 20 },
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#000',
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.7, sm: 1 },
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' }
                }}
              >
                Edit Cover
              </Button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handleBannerFile}
              />
            </>
          )}
        </Box>

        <Modal open={Boolean(bannerPreview)} onClose={() => !bannerUploading && setBannerPreview(null)}>
          <Box
            sx={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(6px)',
              backgroundColor: 'rgba(0,0,0,0.35)',
              p: { xs: 1, sm: 2 }
            }}
          >
            <Paper sx={{ 
              width: '95%', 
              maxWidth: { xs: '100%', sm: 700, md: 920 }, 
              maxHeight: { xs: '95vh', sm: '90vh' }, 
              overflow: 'auto', 
              p: { xs: 2, sm: 3, md: 4 }, 
              borderRadius: { xs: '8px', sm: '12px' }
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>Cover Preview</Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Drag and resize the crop box to choose your cover. Use arrow keys to nudge (Shift for faster). Press R to reset.
              </Typography>
              {bannerPreview && (
                <Box
                  ref={previewRef}
                  sx={{
                    width: '100%',
                    height: { xs: 240, sm: 320, md: 360 },
                    borderRadius: { xs: '8px', sm: '12px' },
                    overflow: 'hidden',
                    mb: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    bgcolor: 'action.hover'
                  }}
                  tabIndex={0}
                  onKeyDown={handleKeyDown}
                >
                  <Box
                    component="img"
                    src={bannerPreview}
                    alt="Banner preview"
                    sx={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }}
                    style={{ filter: filterMap[bannerFilter] || 'none' }}
                    onLoad={(e) => {
                      const nw = e.currentTarget.naturalWidth;
                      const nh = e.currentTarget.naturalHeight;
                      if (nw && nh) setImageSize({ width: nw, height: nh });
                      updatePreviewSize();
                      initCropToImageBox();
                      setCropActive(true);
                    }}
                  />
                  {/* Crop overlay */}
                  {cropActive && cropRect.width > 0 && cropRect.height > 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${getImageBox().x + cropRect.x}px`,
                        top: `${getImageBox().y + cropRect.y}px`,
                        width: `${cropRect.width}px`,
                        height: `${cropRect.height}px`,
                        border: '2px solid #0ea5e9',
                        boxShadow: '0 0 0 100vmax rgba(0,0,0,0.2) inset',
                        cursor: 'move'
                      }}
                      onMouseDown={(e) => startDrag('move', e)}
                      onTouchStart={(e) => startDrag('move', e)}
                    >
                      {[{k:'nw',left:-6,top:-6},{k:'ne',left:cropRect.width-6,top:-6},{k:'sw',left:-6,top:cropRect.height-6},{k:'se',left:cropRect.width-6,top:cropRect.height-6}] .map(h => (
                        <Box
                          key={h.k}
                          sx={{ position: 'absolute', left: `${h.left}px`, top: `${h.top}px`, width: 12, height: 12, backgroundColor: '#0ea5e9', borderRadius: '2px', cursor: `${h.k}-resize` }}
                          onMouseDown={(e) => { e.stopPropagation(); startDrag(h.k, e); }}
                          onTouchStart={(e) => { e.stopPropagation(); startDrag(h.k, e); }}
                        />
                      ))}
                    </Box>
                  )}
                  {/* Global move/resize listeners */}
                  <Box
                    sx={{ position: 'absolute', inset: 0 }}
                    onMouseMove={handleDrag}
                    onMouseUp={endDrag}
                    onMouseLeave={endDrag}
                    onTouchMove={handleDrag}
                    onTouchEnd={endDrag}
                  />
                </Box>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Filters</Typography>
                  <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                    {filterOptions.map((opt) => (
                      <Box
                        key={opt.key}
                        onClick={() => setBannerFilter(opt.key)}
                        sx={{
                          cursor: 'pointer',
                          border: bannerFilter === opt.key ? '2px solid' : '1px solid',
                          borderColor: bannerFilter === opt.key ? 'primary.main' : 'divider',
                          borderRadius: '10px',
                          p: 0.5,
                          minWidth: 90,
                          textAlign: 'center',
                          bgcolor: 'background.paper'
                        }}
                      >
                        <Box
                          component="img"
                          src={bannerPreview}
                          alt={opt.label}
                          sx={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: '8px' }}
                          style={{ filter: filterMap[opt.key] || 'none' }}
                        />
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{opt.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Crop</Typography>
                  <Typography variant="caption" color="textSecondary">Drag the crop box to move; resize using corner handles.</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveBanner}
                  disabled={bannerUploading}
                  startIcon={bannerUploading ? <CircularProgress size={16} /> : <UploadIcon />}
                >
                  {bannerUploading ? 'Saving...' : 'Save Cover'}
                </Button>
                <Button variant="text" disabled={!cropActive} onClick={initCropToImageBox}>
                  Reset Crop
                </Button>
                <Button variant="outlined" disabled={bannerUploading} onClick={() => setBannerPreview(null)}>
                  Cancel
                </Button>
              </Box>
            </Paper>
          </Box>
        </Modal>
          {/* Header Content - Student profile style */}
          <Box sx={{ px: { xs: 2, md: 4 }, pb: 3 }}>
            <Box
              sx={{
                mt: { xs: '-48px', md: '-72px' },
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 2, md: 4 },
                flexWrap: 'wrap'
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: { xs: 96, md: 144 },
                  height: { xs: 96, md: 144 },
                  borderRadius: '50%',
                  overflow: 'hidden',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                  border: '4px solid',
                  borderColor: '#fff'
                }}
              >
                {formData.logo_url ? (
                  <Box
                    component="img"
                    src={formData.logo_url}
                    alt={`${displaySchoolName} logo`}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    style={{ filter: filterMap[logoFilter] || 'none' }}
                  />
                ) : (
                  <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
                      {displaySchoolName.charAt(0).toUpperCase()}
                    </Typography>
                  </Box>
                )}
                {isSchoolAdmin && (
                  <>
                    <Button
                      size="small"
                      startIcon={<EditIcon sx={{ fontSize: { xs: '16px', sm: '18px' } }} />}
                      onClick={triggerLogoSelect}
                      sx={{
                        position: 'absolute',
                        right: 4,
                        bottom: 4,
                        bgcolor: 'background.paper',
                        opacity: 0.95,
                        fontWeight: 600,
                        fontSize: { xs: '0.7rem', sm: '0.8rem' },
                        py: { xs: 0.5, sm: 0.75 },
                        px: { xs: 1, sm: 1.5 }
                      }}
                    >
                      Edit
                    </Button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      hidden
                      onChange={handleLogoFile}
                    />
                  </>
                )}
              </Box>

              <Stack direction="row" spacing={{ xs: 2, md: 3 }} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{profile?.post_count || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Posts</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{profile?.follower_count || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Followers</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>95%</Typography>
                  <Typography variant="body2" color="text.secondary">Engagement</Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ mt: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                {displaySchoolName}
              </Typography>
              {profile?.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
                  {profile.description}
                </Typography>
              )}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`School ID: ${schoolId}`} variant="outlined" />
                <Chip label="School Page" color="primary" variant="outlined" />
                <Chip label="Community Feed" variant="outlined" />
              </Stack>
            </Box>

            {profile?.vision_statement && (
              <>
                <Divider sx={{ my: 2.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Vision & Mission</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {profile.vision_statement}
                </Typography>
              </>
            )}
          </Box>
      </Paper>

      <Modal open={Boolean(logoPreview)} onClose={() => !logoUploading && setLogoPreview(null)}>
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(0,0,0,0.35)',
            p: { xs: 1, sm: 2 }
          }}
        >
          <Paper sx={{ 
            width: '95%', 
            maxWidth: { xs: '100%', sm: 500, md: 620 }, 
            maxHeight: { xs: '95vh', sm: '90vh' }, 
            overflow: 'auto', 
            p: { xs: 2, sm: 3, md: 4 }, 
            borderRadius: { xs: '8px', sm: '12px' }
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700, 
                mb: 1,
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}
            >Logo Preview</Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary', 
                mb: 2,
                fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }}
            >
              Drag and resize the crop box to choose your logo. Use arrow keys to nudge (Shift for faster). Press R to reset.
            </Typography>
            {logoPreview && (
              <Box
                ref={previewRefLogo}
                sx={{
                  width: '100%',
                  height: { xs: 240, sm: 320, md: 360 },
                  borderRadius: { xs: '8px', sm: '12px' },
                  overflow: 'hidden',
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  position: 'relative',
                  bgcolor: 'action.hover'
                }}
                tabIndex={0}
                onKeyDown={handleKeyDownLogo}
              >
                <Box
                  component="img"
                  src={logoPreview}
                  alt="Logo preview"
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }}
                  style={{ filter: filterMap[logoFilter] || 'none' }}
                  onLoad={(e) => {
                    const nw = e.currentTarget.naturalWidth;
                    const nh = e.currentTarget.naturalHeight;
                    if (nw && nh) setImageSizeLogo({ width: nw, height: nh });
                    updatePreviewSizeLogo();
                    initCropToImageBoxLogo();
                    setCropActiveLogo(true);
                  }}
                />
                {cropActiveLogo && cropRectLogo.width > 0 && cropRectLogo.height > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${getImageBoxLogo().x + cropRectLogo.x}px`,
                      top: `${getImageBoxLogo().y + cropRectLogo.y}px`,
                      width: `${cropRectLogo.width}px`,
                      height: `${cropRectLogo.height}px`,
                      border: '2px solid #0ea5e9',
                      boxShadow: '0 0 0 100vmax rgba(0,0,0,0.2) inset',
                      cursor: 'move'
                    }}
                    onMouseDown={(e) => startDragLogo('move', e)}
                    onTouchStart={(e) => startDragLogo('move', e)}
                  >
                    {/* Circular preview ring to simulate final avatar */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '2px dashed rgba(14,165,233,0.8)',
                        pointerEvents: 'none'
                      }}
                    />
                    {[{k:'nw',left:-6,top:-6},{k:'ne',left:cropRectLogo.width-6,top:-6},{k:'sw',left:-6,top:cropRectLogo.height-6},{k:'se',left:cropRectLogo.width-6,top:cropRectLogo.height-6}] .map(h => (
                      <Box
                        key={h.k}
                        sx={{ position: 'absolute', left: `${h.left}px`, top: `${h.top}px`, width: 12, height: 12, backgroundColor: '#0ea5e9', borderRadius: '2px', cursor: `${h.k}-resize` }}
                        onMouseDown={(e) => { e.stopPropagation(); startDragLogo(h.k, e); }}
                        onTouchStart={(e) => { e.stopPropagation(); startDragLogo(h.k, e); }}
                      />
                    ))}
                  </Box>
                )}
                <Box
                  sx={{ position: 'absolute', inset: 0 }}
                  onMouseMove={handleDragLogo}
                  onMouseUp={endDragLogo}
                  onMouseLeave={endDragLogo}
                  onTouchMove={handleDragLogo}
                  onTouchEnd={endDragLogo}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Filters</Typography>
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                  {filterOptions.map((opt) => (
                    <Box
                      key={opt.key}
                      onClick={() => setLogoFilter(opt.key)}
                      sx={{
                        cursor: 'pointer',
                        border: logoFilter === opt.key ? '2px solid' : '1px solid',
                        borderColor: logoFilter === opt.key ? 'primary.main' : 'divider',
                        borderRadius: '10px',
                        p: 0.5,
                        minWidth: 90,
                        textAlign: 'center',
                        bgcolor: 'background.paper'
                      }}
                    >
                      <Box
                        component="img"
                        src={logoPreview}
                        alt={opt.label}
                        sx={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: '8px' }}
                        style={{ filter: filterMap[opt.key] || 'none' }}
                      />
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{opt.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Button
                variant="contained"
                onClick={handleSaveLogo}
                disabled={logoUploading}
                startIcon={logoUploading ? <CircularProgress size={16} /> : <UploadIcon />}
                sx={{ flex: { xs: 1, sm: 'auto' } }}
              >
                {logoUploading ? 'Saving...' : 'Save Logo'}
              </Button>
              <Button 
                variant="text" 
                disabled={!cropActiveLogo} 
                onClick={initCropToImageBoxLogo}
                sx={{ flex: { xs: 1, sm: 'auto' } }}
              >
                Reset Crop
              </Button>
              <Button 
                variant="outlined" 
                disabled={logoUploading} 
                onClick={() => setLogoPreview(null)}
                sx={{ flex: { xs: 1, sm: 'auto' } }}
              >
                Cancel
              </Button>
            </Box>
          </Paper>
        </Box>
      </Modal>

      <Divider />

      {/* Student-profile style 3-column content area */}
      <Grid container spacing={0} columns={12} sx={{ bgcolor: 'background.default', width: '100%', m: 0 }}>
        {/* LEFT */}
        <Grid size={{ xs: 12, md: 3 }} sx={{ p: { xs: 2, md: 2 } }}>
          <Stack spacing={2}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: '700', 
                mb: { xs: 2, sm: 3 },
                fontSize: { xs: '0.95rem', sm: '1.1rem' }
              }}
            >
              School Stats
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2.5 } }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                pb: { xs: 1, sm: 2 }, 
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary', 
                    fontWeight: 500,
                    fontSize: { xs: '0.8rem', sm: '0.9rem' }
                  }}
                >Total Posts</Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: '700', 
                    color: 'primary.main',
                    fontSize: { xs: '1.25rem', sm: '1.75rem' }
                  }}
                >{profile?.post_count || 0}</Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                pb: { xs: 1, sm: 2 }, 
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary', 
                    fontWeight: 500,
                    fontSize: { xs: '0.8rem', sm: '0.9rem' }
                  }}
                >Followers</Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: '700', 
                    color: 'primary.main',
                    fontSize: { xs: '1.25rem', sm: '1.75rem' }
                  }}
                >{profile?.follower_count || 0}</Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                pb: { xs: 1, sm: 2 }, 
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary', 
                    fontWeight: 500,
                    fontSize: { xs: '0.8rem', sm: '0.9rem' }
                  }}
                >Engagement Rate</Typography>
                <Typography variant="h5" sx={{ fontWeight: '700', color: 'success.main' }}>95%</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>Active Since</Typography>
                <Typography variant="body2" sx={{ fontWeight: '600' }}>2024</Typography>
              </Box>
            </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" sx={{ fontWeight: '700', mb: 3 }}>
              Badges & Titles
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                <Box sx={{ fontSize: '28px' }}>🏆</Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: '700', color: '#92400e' }}>Top Contributor</Typography>
                  <Typography variant="caption" sx={{ color: '#78350f' }}>Most active school</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: '#dbeafe', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                <Box sx={{ fontSize: '28px' }}>⭐</Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: '700', color: '#1e40af' }}>Verified School</Typography>
                  <Typography variant="caption" sx={{ color: '#1e3a8a' }}>Official account</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: '#dcfce7', borderRadius: '8px', border: '1px solid #10b981' }}>
                <Box sx={{ fontSize: '28px' }}>📚</Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: '700', color: '#065f46' }}>Education Leader</Typography>
                  <Typography variant="caption" sx={{ color: '#064e3b' }}>Excellence in education</Typography>
                </Box>
              </Box>
            </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* CENTER */}
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            p: { xs: 2, md: 2 },
            borderLeft: { md: '1px solid' },
            borderRight: { md: '1px solid' },
            borderColor: { md: 'divider' }
          }}
        >
          <SchoolPostFeed schoolId={schoolId} isAdmin={isSchoolAdmin} />
        </Grid>

        {/* RIGHT */}
        <Grid size={{ xs: 12, md: 3 }} sx={{ p: { xs: 2, md: 2 } }}>
          <Stack spacing={2}>
            {user && (
              <Paper sx={{ p: 3, borderRadius: 2, backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#000' }}>
            Your Profile
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="textSecondary">Name</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {user?.firstName} {user?.lastName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="textSecondary">Email</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {user?.email}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="textSecondary">Role</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#0ea5e9', textTransform: 'capitalize' }}>
                {user?.role?.replace('_', ' ')}
              </Typography>
            </Grid>
            {isSchoolAdmin && (
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">School ID</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {user?.schoolId || user?.school_id}
                </Typography>
              </Grid>
            )}
          </Grid>
              </Paper>
            )}

            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                School Controls
              </Typography>
              <Stack spacing={1.2}>
                {!isSchoolAdmin && (
                  <Button
                    variant={isFollowing ? 'outlined' : 'contained'}
                    onClick={handleFollowClick}
                    disabled={followLoading}
                    sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                  >
                    {followLoading ? <CircularProgress size={16} /> : isFollowing ? 'Following' : 'Follow School'}
                  </Button>
                )}
                {isSchoolAdmin && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEditOpen}
                    sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                  >
                    Edit School Info
                  </Button>
                )}
                {profile?.vision_statement && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    {profile.vision_statement}
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* Edit Profile Modal */}
      <Modal 
        open={editModalOpen} 
        onClose={handleEditClose}
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-end', sm: 'center' },
          justifyContent: 'center'
        }}
      >
        <Paper
          sx={{
            position: { xs: 'fixed', sm: 'absolute' },
            bottom: { xs: 0, sm: 'auto' },
            top: { xs: 'auto', sm: '50%' },
            left: { xs: 0, sm: '50%' },
            right: { xs: 0, sm: 'auto' },
            transform: { xs: 'none', sm: 'translate(-50%, -50%)' },
            width: { xs: '100%', sm: '90%' },
            maxWidth: { xs: 'none', sm: 600 },
            p: { xs: 2, sm: 3, md: 4 },
            maxHeight: { xs: 'calc(100vh - 120px)', sm: '90vh' },
            overflow: 'auto',
            borderRadius: { xs: '16px 16px 0 0', sm: '12px' }
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: { xs: 2, sm: 3 }
          }}>
            <Typography 
              variant="h6"
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem' }
              }}
            >Edit School Page</Typography>
            <Button 
              onClick={handleEditClose} 
              size="small"
              sx={{
                minWidth: 'auto',
                p: 1
              }}
            >
              <CloseIcon />
            </Button>
          </Box>

          <TextField
            fullWidth
            label="School Name"
            value={displaySchoolName}
            margin="normal"
            InputProps={{ readOnly: true }}
            helperText="School name is managed by registration"
            size="small"
          />

          <TextField
            fullWidth
            label="School Description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            margin="normal"
            multiline
            rows={3}
            placeholder="Brief description of your school..."
            size="small"
          />

          <TextField
            fullWidth
            label="Vision & Mission Statement"
            name="vision_statement"
            value={formData.vision_statement}
            onChange={handleFormChange}
            margin="normal"
            multiline
            rows={4}
            placeholder="Share your school's vision and mission..."
            size="small"
          />

          <Box sx={{ 
            mt: { xs: 2, sm: 3 }, 
            display: 'flex', 
            gap: { xs: 1, sm: 1.5 },
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <Button
              variant="contained"
              onClick={handleSaveProfile}
              disabled={loading}
              fullWidth
              sx={{
                py: { xs: 1, sm: 1.2 },
                fontSize: { xs: '0.9rem', sm: '1rem' },
                flex: 1
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleEditClose}
              disabled={loading}
              fullWidth
              sx={{
                py: { xs: 1, sm: 1.2 },
                fontSize: { xs: '0.9rem', sm: '1rem' },
                flex: 1
              }}
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      </Modal>
    </Box>
    </Layout>
  );
}
