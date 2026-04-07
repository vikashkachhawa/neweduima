import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, CircularProgress, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, Stack, Table, TableHead, TableRow, TableCell, TableBody, Paper, Alert } from '@mui/material';

import Grid from '@mui/material/GridLegacy';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Layout from '../components/Layout';
import ConfirmDialog from '../components/ConfirmDialog';
import InfoDialog from '../components/InfoDialog';
import { rbacService } from '../services/rbac';
import { usePermissions } from '../contexts/PermissionContext';

const RoleManagement = () => {
  const { hasPermission } = usePermissions();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', scope: 'school' });
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [infoDialog, setInfoDialog] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes] = await Promise.all([
        rbacService.getRoles(),
        rbacService.getPermissions()
      ]);
      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
    } catch (error) {
      setInfoDialog({
        title: 'Error',
        message: 'Failed to load roles and permissions',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await rbacService.getAuditLogs({ action: 'role_' }, 1000);
      setAuditLogs(res.data.logs);
    } catch (error) {
      setInfoDialog({
        title: 'Error',
        message: 'Failed to load audit logs',
        type: 'error'
      });
    } finally {
      setAuditLoading(false);
    }
  };

  const handleEditRole = async (role) => {
    try {
      const res = await rbacService.getRoleById(role.id);
      setEditingRole(res.data);
      setFormData({ name: res.data.name, description: res.data.description, scope: res.data.scope });
      setSelectedPermissions(res.data.permissions.map(p => p.id));
      setDialogOpen(true);
    } catch (error) {
      setInfoDialog({ title: 'Error', message: 'Failed to load role details', type: 'error' });
    }
  };

  const handleOpenNewDialog = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', scope: 'school' });
    setSelectedPermissions([]);
    setDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!formData.name.trim()) {
      setInfoDialog({ title: 'Error', message: 'Role name is required', type: 'error' });
      return;
    }

    try {
      if (editingRole) {
        await rbacService.updateRole(editingRole.id, formData);
        await rbacService.setRolePermissions(editingRole.id, selectedPermissions);
        setInfoDialog({ title: 'Success', message: 'Role updated successfully', type: 'success' });
      } else {
        await rbacService.createRole(formData);
        setInfoDialog({ title: 'Success', message: 'Role created successfully', type: 'success' });
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      setInfoDialog({ title: 'Error', message: error.response?.data?.error || 'Failed to save role', type: 'error' });
    }
  };

  const handleDeleteRole = (role) => {
    setConfirmDialog({
      title: 'Delete Role',
      description: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await rbacService.deleteRole(role.id);
          setInfoDialog({ title: 'Success', message: 'Role deleted successfully', type: 'success' });
          loadData();
        } catch (error) {
          setInfoDialog({ title: 'Error', message: error.response?.data?.error || 'Failed to delete role', type: 'error' });
        }
      }
    });
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const defaultRoles = ['Super Admin', 'School Admin', 'Faculty', 'Student'];

  return (
    <Layout>
      <Box className="space-y-6">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Role Management
          </h1>
          {hasPermission('role.create') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewDialog}>
              New Role
            </Button>
          )}
        </Box>

        <Tabs value={tabValue} onChange={(e, v) => { setTabValue(v); if (v === 1) loadAuditLogs(); }}>
          <Tab label="Roles" />
          <Tab label="Audit Logs" />
        </Tabs>

        {tabValue === 0 && (
          <Box sx={{ pt: 3 }}>
            <Grid container spacing={3}>
            {roles.map(role => (
              <Grid item xs={12} sm={6} md={4} key={role.id}>
                <Card>
                  <CardHeader
                    title={role.name}
                    subheader={`Scope: ${role.scope}`}
                  />
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {role.description}
                    </p>
                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      {/* Permissions will be shown on role detail page */}
                    </Box>
                    {!defaultRoles.includes(role.name) && hasPermission('role.edit') && (
                      <Box display="flex" gap={1}>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditRole(role)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteRole(role)}
                        >
                          Delete
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            </Grid>
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ pt: 3 }}>
            {auditLoading ? (
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          ) : (
            <Paper>
              <Table>
                <TableHead>
                  <TableRow className="bg-gray-100 dark:bg-gray-800">
                    <TableCell>Action</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map(log => (
                    <TableRow key={log.id} className="border-b">
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.user_name || 'System'}</TableCell>
                      <TableCell>{log.entity_type} #{log.entity_id}</TableCell>
                      <TableCell className="text-sm">{log.reason || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {auditLogs.length === 0 && (
                <Box p={2} textAlign="center" className="text-gray-500">
                  No audit logs found
                </Box>
              )}
            </Paper>
          )}
          </Box>
        )}
      </Box>

      {/* Role Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRole ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogContent className="space-y-4 pt-4">
          <TextField
            fullWidth
            label="Role Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>Scope</InputLabel>
            <Select
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              label="Scope"
            >
              <MenuItem value="platform">Platform</MenuItem>
              <MenuItem value="school">School</MenuItem>
            </Select>
          </FormControl>

          {editingRole && (
            <Box>
              <label className="block text-sm font-medium mb-2">Permissions</label>
              <Box className="border rounded p-3 max-h-300 overflow-y-auto">
                {permissions.map(permission => (
                  <Box key={permission.id} display="flex" alignItems="center" mb={1}>
                    <input
                      type="checkbox"
                      id={`perm-${permission.id}`}
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions([...selectedPermissions, permission.id]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                        }
                      }}
                      className="mr-2"
                    />
                    <label htmlFor={`perm-${permission.id}`} className="text-sm cursor-pointer">
                      {permission.name} ({permission.category})
                    </label>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRole} variant="contained">
            {editingRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          confirmColor={confirmDialog.confirmColor}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Info Dialog */}
      {infoDialog && (
        <InfoDialog
          title={infoDialog.title}
          message={infoDialog.message}
          type={infoDialog.type}
          onClose={() => setInfoDialog(null)}
        />
      )}
    </Layout>
  );
};

export default RoleManagement;
