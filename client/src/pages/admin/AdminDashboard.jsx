import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Divider,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { 
  Person as PersonIcon, 
  DirectionsCar as CarIcon, 
  CheckCircle as CheckCircleIcon, 
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../utils/api';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index) => ({
  id: `admin-tab-${index}`,
  'aria-controls': `admin-tabpanel-${index}`,
});

const AdminDashboard = () => {
  const [value, setValue] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [pendingSpaces, setPendingSpaces] = useState([]);
  const [loading, setLoading] = useState({ verifications: false, spaces: false });
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSpaces: 0,
    pendingVerifications: 0,
    pendingSpaces: 0,
  });

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [currentUser, navigate]);

  const loadData = async () => {
    try {
      setLoading(prev => ({ ...prev, verifications: true }));
      const [verificationsRes, spacesRes, statsRes] = await Promise.all([
        api.get('/admin/verifications/pending'),
        api.get('/admin/parking-spaces/pending'),
        api.get('/admin/stats')
      ]);
      
      setPendingVerifications(verificationsRes.data);
      setPendingSpaces(spacesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading({ verifications: false, spaces: false });
    }
  };

  const handleTabChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.put(`/admin/verifications/user/${userId}`, { status: 'approved' });
      loadData();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleRejectUser = async () => {
    if (!selectedUser) return;
    
    try {
      setIsRejecting(true);
      await api.put(`/admin/verifications/user/${selectedUser._id}`, { 
        status: 'rejected',
        reason: rejectionReason 
      });
      setOpenRejectDialog(false);
      setRejectionReason('');
      loadData();
    } catch (error) {
      console.error('Error rejecting user:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApproveSpace = async (spaceId) => {
    try {
      await api.put(`/admin/parking-spaces/${spaceId}/review`, { status: 'approved' });
      loadData();
    } catch (error) {
      console.error('Error approving space:', error);
    }
  };

  const handleRejectSpace = async () => {
    if (!selectedSpace) return;
    
    try {
      setIsRejecting(true);
      await api.put(`/admin/parking-spaces/${selectedSpace._id}/review`, { 
        status: 'rejected',
        reason: rejectionReason 
      });
      setOpenRejectDialog(false);
      setRejectionReason('');
      loadData();
    } catch (error) {
      console.error('Error rejecting space:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const openRejectUserDialog = (user) => {
    setSelectedUser(user);
    setSelectedSpace(null);
    setOpenRejectDialog(true);
  };

  const openRejectSpaceDialog = (space) => {
    setSelectedSpace(space);
    setSelectedUser(null);
    setOpenRejectDialog(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 3 }}>
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
        <Button 
          variant="outlined" 
          color="error"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Total Users</Typography>
                  <Typography variant="h4">{stats.totalUsers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CarIcon color="secondary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Total Spaces</Typography>
                  <Typography variant="h4">{stats.totalSpaces}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Pending Verifications</Typography>
                  <Typography variant="h4">{stats.pendingVerifications}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CarIcon color="info" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h6">Pending Spaces</Typography>
                  <Typography variant="h4">{stats.pendingSpaces}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleTabChange} 
            aria-label="admin tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Pending Verifications" {...a11yProps(0)} />
            <Tab label="Pending Spaces" {...a11yProps(1)} />
          </Tabs>
        </Box>

        <TabPanel value={value} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
              disabled={loading.verifications}
            >
              Refresh
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Documents</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading.verifications ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">Loading...</TableCell>
                  </TableRow>
                ) : pendingVerifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No pending verifications</TableCell>
                  </TableRow>
                ) : (
                  pendingVerifications.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2 }}>
                            {user.name.charAt(0).toUpperCase()}
                          </Avatar>
                          {user.name}
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>
                        {user.kycDocuments?.map((doc, idx) => (
                          <Chip
                            key={idx}
                            icon={<VisibilityIcon />}
                            label={doc.type}
                            onClick={() => window.open(doc.url, '_blank')}
                            sx={{ mr: 1, mb: 1 }}
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleApproveUser(user._id)}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() => openRejectUserDialog(user)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={value} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
              disabled={loading.spaces}
            >
              Refresh
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Space</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading.spaces ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">Loading...</TableCell>
                  </TableRow>
                ) : pendingSpaces.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No pending parking spaces</TableCell>
                  </TableRow>
                ) : (
                  pendingSpaces.map((space) => (
                    <TableRow key={space._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            src={space.images?.[0]} 
                            variant="rounded" 
                            sx={{ width: 56, height: 56, mr: 2 }}
                          >
                            <CarIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1">{space.title}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              {space.vehicleType}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {space.address?.city}, {space.address?.state}
                      </TableCell>
                      <TableCell>
                        {space.owner?.name}
                        <Typography variant="body2" color="textSecondary">
                          {space.owner?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        ₹{space.pricePerHour}/hour
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleApproveSpace(space._id)}
                          sx={{ mr: 1, mb: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() => openRejectSpaceDialog(space)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Rejection Dialog */}
      <Dialog 
        open={openRejectDialog} 
        onClose={() => setOpenRejectDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedUser ? 'Reject User Verification' : 'Reject Parking Space'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Please provide a reason for rejection:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            id="rejectionReason"
            label="Reason for rejection"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenRejectDialog(false);
              setRejectionReason('');
            }}
            disabled={isRejecting}
          >
            Cancel
          </Button>
          <Button 
            onClick={selectedUser ? handleRejectUser : handleRejectSpace}
            color="error"
            variant="contained"
            disabled={!rejectionReason.trim() || isRejecting}
          >
            {isRejecting ? 'Processing...' : 'Submit Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
