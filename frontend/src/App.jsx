import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schools from './pages/Schools';
import Users from './pages/Users';
import RoleManagement from './pages/RoleManagement';
import Subscriptions from './pages/Subscriptions';
import Analytics from './pages/Analytics';
import SchoolAdmin from './pages/SchoolAdmin';
import Faculty from './pages/Faculty';
import Students from './pages/Students';
import Announcements from './pages/Announcements';
import SystemSettings from './pages/SystemSettings';
import Security from './pages/Security';
import SuperAdminTemplates from './pages/SuperAdminTemplates';
import SchoolTemplateLibrary from './pages/SchoolTemplateLibrary';
import SchoolPageProfile from './pages/SchoolPageProfile';
import SchoolDetails from './pages/SchoolDetails';
import FacultyLogin from './pages/FacultyLogin';
import FacultyClasses from './pages/FacultyClasses';
import FacultyStudents from './pages/FacultyStudents';
import FacultyAssignments from './pages/FacultyAssignments';
import FacultyAttendance from './pages/FacultyAttendance';
import FacultySchedule from './pages/FacultySchedule';
import FacultyProfile from './pages/FacultyProfile';
import StudentProfile from './pages/StudentProfile';
import StudentFunLearning from './pages/StudentFunLearning';
import FunLearningGame from './pages/FunLearningGame';
import SocialHub from './pages/SocialHub';
import Forum from './pages/Forum';
import ForumQuestion from './pages/ForumQuestion';
import Chat from './pages/Chat';
import ChatUserProfile from './pages/ChatUserProfile';
import ChangePasswordOnFirstLogin from './pages/ChangePasswordOnFirstLogin';
import SchoolUserDetail from './pages/SchoolUserDetail';
import CodeArena from './pages/CodeArena';
import CodeArenaRoom from './pages/CodeArenaRoom';
import CodeArenaFaculty from './pages/CodeArenaFaculty';

const getDefaultRouteByRole = (role) => {
    if (role === 'student') return '/student/profile';
    if (role === 'faculty') return '/faculty/profile';
    return '/dashboard';
};

const RoleHomeRedirect = () => {
    const { user, loading } = useAuth();

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (user.mustChangePassword || user.must_change_password) {
        return <Navigate to="/change-password" replace />;
    }

    return <Navigate to={getDefaultRouteByRole(user.role)} replace />;
};

const DashboardEntry = () => {
    const { user, loading } = useAuth();

    if (loading) return null;
    if (user?.role === 'student') return <Navigate to="/student/profile" replace />;
    if (user?.role === 'faculty') return <Navigate to="/faculty/dashboard" replace />;

    return <Dashboard />;
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <PermissionProvider>
                    <SubscriptionProvider>
                        <BrowserRouter>
                        <Routes>
                        <Route path="/faculty/login" element={<FacultyLogin />} />
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/change-password"
                            element={
                                <ProtectedRoute>
                                    <ChangePasswordOnFirstLogin />
                                </ProtectedRoute>
                            }
                        />
                        
                        {/* Student Routes */}
                        <Route
                            path="/student/dashboard"
                            element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <Navigate to="/student/profile" replace />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/student/profile"
                            element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <StudentProfile />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/student/profile/:studentId"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin', 'faculty', 'student']}>
                                    <StudentProfile />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/student/fun-learning"
                            element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <StudentFunLearning />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/student/fun-learning/game/:gameSlug"
                            element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <FunLearningGame />
                                </ProtectedRoute>
                            }
                        />
                        {/* Faculty Profile */}
                        <Route
                            path="/faculty/profile"
                            element={
                                <ProtectedRoute allowedRoles={['faculty']}>
                                    <FacultyProfile />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/faculty/profile/:facultyId"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin', 'faculty', 'student']}>
                                    <FacultyProfile />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/social-hub"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin', 'faculty', 'student']}>
                                    <SocialHub />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/forum"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin', 'faculty', 'student']}>
                                    <Forum />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/forum/:questionId"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin', 'faculty', 'student']}>
                                    <ForumQuestion />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/chat"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin', 'faculty', 'student']}>
                                    <Chat />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/chat/profile/:userId"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin', 'faculty', 'student']}>
                                    <ChatUserProfile />
                                </ProtectedRoute>
                            }
                        />
                        
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardEntry />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/faculty/dashboard"
                            element={<Navigate to="/faculty/profile" replace />}
                        />

                        <Route
                            path="/faculty/classes"
                            element={
                                <ProtectedRoute allowedRoles={['faculty']}>
                                    <FacultyClasses />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/faculty/students"
                            element={
                                <ProtectedRoute allowedRoles={['faculty']}>
                                    <FacultyStudents />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/faculty/assignments"
                            element={
                                <ProtectedRoute allowedRoles={['faculty']}>
                                    <FacultyAssignments />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/faculty/attendance"
                            element={
                                <ProtectedRoute allowedRoles={['faculty']}>
                                    <FacultyAttendance />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/faculty/schedule"
                            element={
                                <ProtectedRoute allowedRoles={['faculty']}>
                                    <FacultySchedule />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/schools"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin']}>
                                    <Schools />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/schools/:schoolId"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin']}>
                                    <SchoolDetails />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/users"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin','school_admin']}>
                                    <Users />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/roles"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin']}>
                                    <RoleManagement />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/subscriptions"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin']}>
                                    <Subscriptions />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/analytics"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin']}>
                                    <Analytics />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/templates"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin']}>
                                    <SuperAdminTemplates />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/announcements"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin','school_admin']}>
                                    <Announcements />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/system-settings"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin']}>
                                    <SystemSettings />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/security"
                            element={
                                <ProtectedRoute allowedRoles={['super_admin']}>
                                    <Security />
                                </ProtectedRoute>
                            }
                        />

                        {/* School Admin pages */}
                        <Route
                            path="/school-admin"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin']}>
                                    <SchoolAdmin />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/school-admin/users/:userId"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin']}>
                                    <SchoolUserDetail />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/template-library"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin']}>
                                    <SchoolTemplateLibrary />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/school-page/:schoolId"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin']}>
                                    <ErrorBoundary>
                                        <SchoolPageProfile />
                                    </ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/faculty"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin','faculty']}>
                                    <Faculty />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/students"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin','faculty']}>
                                    <Students />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/reports"
                            element={
                                <ProtectedRoute allowedRoles={['school_admin']}>
                                    <PlaceholderPage title="Reports" />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/classes"
                            element={
                                <ProtectedRoute allowedRoles={['faculty']}>
                                    <PlaceholderPage title="Classes" />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/attendance"
                            element={
                                <ProtectedRoute allowedRoles={['faculty', 'student']}>
                                    <PlaceholderPage title="Attendance" />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/courses"
                            element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <PlaceholderPage title="Courses" />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/grades"
                            element={
                                <ProtectedRoute allowedRoles={['student']}>
                                    <PlaceholderPage title="Grades" />
                                </ProtectedRoute>
                            }
                        />

                        {/* CodeArena Routes */}
                        <Route
                            path="/codearena"
                            element={
                                <ProtectedRoute allowedRoles={['faculty', 'school_admin', 'student']}>
                                    <CodeArena />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/codearena/rooms/:roomId"
                            element={
                                <ProtectedRoute allowedRoles={['faculty', 'school_admin', 'student']}>
                                    <CodeArenaRoom />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/codearena/rooms/:roomId/manage"
                            element={
                                <ProtectedRoute allowedRoles={['faculty', 'school_admin']}>
                                    <CodeArenaFaculty />
                                </ProtectedRoute>
                            }
                        />

                        <Route path="/" element={<RoleHomeRedirect />} />
                        <Route path="*" element={<RoleHomeRedirect />} />
                    </Routes>
                        </BrowserRouter>
                    </SubscriptionProvider>
                </PermissionProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

// Placeholder component for未实现的页面
const PlaceholderPage = ({ title }) => {
    const Layout = require('./components/Layout').default;
    return (
        <Layout>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {title}
                </h1>
                <div className="card">
                    <p className="text-gray-600 dark:text-gray-400">
                        This page is under construction. Features will be available in the next phase.
                    </p>
                </div>
            </div>
        </Layout>
    );
};

export default App;
