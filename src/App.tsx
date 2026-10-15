import React, { useState, useEffect, useCallback } from 'react';
import type {
  Ticket,
  TicketDetail,
  TicketCounts,
  StatusFilter,
  SortField,
  SortOrder,
  TicketStatus,
} from './shared/types';
import { api } from './services/api';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TicketTable } from './components/TicketTable';
import { CreateTicketModal } from './components/CreateTicketModal';
import { TicketDetailModal } from './components/TicketDetailModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer, type ToastMessage } from './components/Toast';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  // Navigation & Filtering State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Tickets Data State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<TicketCounts>({ all: 0, byStatus: {}, open: 0, resolved: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Delete Confirmation State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Tickets
  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getTickets({
        status: statusFilter,
        search,
        sortBy,
        sortOrder,
      });
      setTickets(res.tickets);
      setCounts(res.counts);
    } catch (err: any) {
      showToast(err.message || 'Failed to load tickets', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, sortBy, sortOrder, showToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Create Ticket Handler
  const handleCreateTicket = async (data: {
    title: string;
    description: string;
    status: TicketStatus;
  }) => {
    const newTicket = await api.createTicket(data);
    showToast(`Created ticket ${newTicket.key}`, 'success');
    await fetchTickets();
  };

  // Open Ticket Details
  const handleSelectTicket = async (ticket: Ticket) => {
    try {
      setIsLoadingDetail(true);
      setIsDetailOpen(true);
      const detail = await api.getTicket(ticket.key);
      setSelectedTicket(detail);
    } catch (err: any) {
      showToast(err.message || 'Failed to open ticket details', 'error');
      setIsDetailOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Update Ticket Details (Title/Description)
  const handleUpdateTicketDetails = async (title: string, description: string) => {
    if (!selectedTicket) return;
    const updated = await api.updateTicket(selectedTicket.key, { title, description });
    setSelectedTicket((prev) => (prev ? { ...prev, ...updated } : null));
    showToast(`Saved changes for ${selectedTicket.key}`, 'success');
    await fetchTickets();
  };

  // Change Ticket Status to any workflow status
  const handleChangeStatus = async (ticket: Ticket, nextStatus: TicketStatus) => {
    try {
      const updated = await api.updateTicket(ticket.key, { status: nextStatus });
      showToast(`Marked ${ticket.key} as ${nextStatus}`, 'success');

      // Update selected ticket if currently viewing detail
      if (selectedTicket && selectedTicket.id === ticket.id) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: nextStatus, updated_at: updated.updated_at } : null));
      }

      await fetchTickets();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Add Comment
  const handleAddComment = async (text: string) => {
    if (!selectedTicket) return;
    const newComment = await api.addComment(selectedTicket.key, text);
    setSelectedTicket((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        comments: [...prev.comments, newComment],
        comment_count: (prev.comment_count || 0) + 1,
        updated_at: newComment.created_at,
      };
    });
    showToast('Comment added', 'success');
    await fetchTickets();
  };

  // Delete Request Triggers
  const handleDeleteRequestFromRow = (ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(ticket);
    setIsDeleteOpen(true);
  };

  const handleDeleteRequestFromDetail = () => {
    if (!selectedTicket) return;
    setDeleteTarget(selectedTicket);
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.deleteTicket(deleteTarget.key);
      showToast(`Deleted ticket ${deleteTarget.key}`, 'success');
      setIsDeleteOpen(false);
      setDeleteTarget(null);

      // Close detail view if deleting the currently viewed ticket
      if (selectedTicket && selectedTicket.id === deleteTarget.id) {
        setIsDetailOpen(false);
        setSelectedTicket(null);
      }

      await fetchTickets();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete ticket', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Seed Data Trigger
  const handleSeedData = async () => {
    try {
      const res = await api.seedDemoData();
      showToast(res.message, res.seeded ? 'success' : 'info');
      await fetchTickets();
    } catch (err: any) {
      showToast(err.message || 'Failed to load sample tickets', 'error');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentFilter={statusFilter}
        onSelectFilter={setStatusFilter}
        counts={counts}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentFilter={statusFilter}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenCreate={() => setIsCreateOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        {/* Ticket List Table */}
        <TicketTable
          tickets={tickets}
          isLoading={isLoading}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={setSortBy}
          onToggleSortOrder={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          onSelectTicket={handleSelectTicket}
          onChangeStatus={handleChangeStatus}
          onDeleteTicket={handleDeleteRequestFromRow}
          onOpenCreate={() => setIsCreateOpen(true)}
          onSeedData={handleSeedData}
        />
      </div>

      {/* Modals & Dialogs */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTicket}
      />

      <TicketDetailModal
        isOpen={isDetailOpen}
        ticket={selectedTicket}
        isLoading={isLoadingDetail}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTicket(null);
        }}
        onStatusChange={(status) => {
          if (!selectedTicket) return Promise.resolve();
          return handleChangeStatus(selectedTicket, status);
        }}
        onUpdateDetails={handleUpdateTicketDetails}
        onAddComment={handleAddComment}
        onDeleteRequest={handleDeleteRequestFromDetail}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        ticket={deleteTarget}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onDataChanged={fetchTickets}
        showToast={showToast}
      />

      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
