// src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import InviteModal from './components/InviteModal';

// Pages
import Overview from './pages/Overview';
import PtGroups from './pages/PtGroups';
import ProductLibrary from './pages/ProductLibrary';
import AddProduct from './pages/AddProduct';
import SmartImageSearch from './pages/SmartImageSearch';
import Categories from './pages/Categories';
import TeamManagement from './pages/TeamManagement';
import WorkspaceSettings from './pages/WorkspaceSettings';
import MyProfile from './pages/MyProfile';
import AcceptInvitation from './pages/AcceptInvitation';

import { api } from './services/api';

export default function App() {
  const [activePage, setActivePage] = useState('pt-groups');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState('admin');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAcceptInvitationRoute, setIsAcceptInvitationRoute] = useState(false);

  useEffect(() => {
    if (window.location.pathname.includes('/accept-invitation') || window.location.search.includes('token=')) {
      setIsAcceptInvitationRoute(true);
      return;
    }
    loadUserSession();
  }, []);

  async function loadUserSession() {
    try {
      const res = await api.getMe();
      setCurrentUser(res.user);
      setCurrentRole(res.role || 'admin');
    } catch (e) {
      setCurrentUser({
        id: 'usr_admin_001',
        email: 'admin@walmart.com',
        full_name: 'Workspace Owner (Admin)',
      });
      setCurrentRole('admin');
    }
  }

  function handleSwitchRole(newRole) {
    setCurrentRole(newRole);
    if (newRole !== 'admin' && (activePage === 'team' || activePage === 'settings')) {
      setActivePage('pt-groups');
    }
    if (newRole === 'viewer' && activePage === 'add-product') {
      setActivePage('pt-groups');
    }
  }

  if (isAcceptInvitationRoute) {
    return (
      <AcceptInvitation
        onAccepted={(user, role) => {
          if (user) setCurrentUser(user);
          if (role) setCurrentRole(role);
          setIsAcceptInvitationRoute(false);
          window.history.replaceState({}, document.title, '/');
          setActivePage('pt-groups');
        }}
      />
    );
  }

  const pageTitles = {
    overview: { title: 'Overview', subtitle: 'Walmart classification workspace dashboard' },
    'pt-groups': { title: 'PT Groups', subtitle: 'Multiple images with the same PT grouped together' },
    'add-product': { title: 'Simple Upload', subtitle: 'Upload/paste product image and assign Walmart PT' },
    'smart-search': { title: 'Image Search', subtitle: 'Ctrl + V image paste to find exact/similar images and saved PTs' },
    library: { title: 'All Images', subtitle: 'Catalog of classified product images with creator tracking' },
    categories: { title: 'Taxonomy Categories', subtitle: 'Official retail departments organizing all Walmart PTs' },
    team: { title: 'Team Management', subtitle: 'Invite teammates by email, assign Editor or Viewer access' },
    settings: { title: 'Workspace Settings', subtitle: 'Manage workspace configuration and security' },
    profile: { title: 'My Profile', subtitle: 'Your account identity and permission capabilities' },
  };

  const currentNav = pageTitles[activePage] || { title: 'Workspace', subtitle: '' };

  return (
    <div className="flex h-screen bg-[#0B0F17] text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        currentUser={currentUser}
        currentRole={currentRole}
        onSwitchRole={handleSwitchRole}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar
          title={currentNav.title}
          subtitle={currentNav.subtitle}
          currentRole={currentRole}
          onOpenInvite={() => setInviteModalOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNavigateAddProduct={() => setActivePage('add-product')}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activePage === 'overview' && (
            <Overview
              currentRole={currentRole}
              onNavigate={(page) => setActivePage(page)}
              onOpenInvite={() => setInviteModalOpen(true)}
            />
          )}

          {activePage === 'pt-groups' && (
            <PtGroups currentRole={currentRole} />
          )}

          {activePage === 'add-product' && (
            <AddProduct
              currentRole={currentRole}
              onNavigatePtGroups={() => setActivePage('pt-groups')}
            />
          )}

          {activePage === 'smart-search' && (
            <SmartImageSearch onSelectPt={() => setActivePage('pt-groups')} />
          )}

          {activePage === 'library' && (
            <ProductLibrary
              currentRole={currentRole}
              onNavigateAdd={() => setActivePage('add-product')}
              onNavigateSmartSearch={() => setActivePage('smart-search')}
            />
          )}

          {activePage === 'categories' && <Categories />}

          {activePage === 'team' && (
            <TeamManagement currentRole={currentRole} currentUser={currentUser} />
          )}

          {activePage === 'settings' && (
            <WorkspaceSettings currentRole={currentRole} currentUser={currentUser} />
          )}

          {activePage === 'profile' && (
            <MyProfile
              currentUser={currentUser}
              currentRole={currentRole}
              onProfileUpdated={(updatedUser, updatedRole) => {
                if (updatedUser) setCurrentUser(updatedUser);
                if (updatedRole) setCurrentRole(updatedRole);
              }}
            />
          )}
        </main>
      </div>

      {/* Team Invitation Modal */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvitationSent={() => {
          if (activePage === 'team') {
            window.location.reload();
          }
        }}
      />
    </div>
  );
}
