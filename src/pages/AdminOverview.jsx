import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AdminOverview() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalArticles: 0, pendingReviews: 0, publishedArticles: 0, totalUsers: 0 });
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const [queue, setQueue] = useState([]);
    const [publishedArticles, setPublishedArticles] = useState([]);
    const [archivedArticles, setArchivedArticles] = useState([]);
    const [categories, setCategories] = useState([]);

    const [activeTab, setActiveTab] = useState("Dashboard");
    const [searchQuery, setSearchQuery] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // STATE: Fitur SLA Countdown
    const [oldestArticle, setOldestArticle] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState("");
    const [elapsedHours, setElapsedHours] = useState(0);
    const [isWarning, setIsWarning] = useState(false); // True jika sisa waktu <= 12 Jam

    // STATE: Tab Notifikasi (Belum/Sudah Dibaca) menggunakan LocalStorage agar awet
    const [activeNotifTab, setActiveNotifTab] = useState("Belum Dibaca");
    const [readNotifs, setReadNotifs] = useState(() => JSON.parse(localStorage.getItem('adminReadNotifs')) || []);

    // STATE: Modal Edit Admin (Teks + Gambar)
    const [editingAdminArticle, setEditingAdminArticle] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editCategoryId, setEditCategoryId] = useState("");
    const [editContent, setEditContent] = useState("");
    const [adminImageFile, setAdminImageFile] = useState(null);
    const [adminImagePreview, setAdminImagePreview] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const navigate = useNavigate();

    // Fungsi Render URL Gambar dari Bucket REACT_NDN
    const getImageUrl = (imagePath) => {
        if (!imagePath) return "https://images.unsplash.com/photo-1541876751093-68d6d67b7891?q=80&w=1200";
        if (imagePath.startsWith("http")) return imagePath;
        const cleanPath = imagePath.startsWith("articles/") ? imagePath : `articles/${imagePath}`;
        return `https://kbahpvjqnvujodhaauyn.supabase.co/storage/v1/object/public/REACT_NDN/${cleanPath}`;
    };

    const fetchAdminData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { navigate("/login"); return; }
            const { data: userData } = await supabase.from("users").select("is_admin").eq("email", session.user.email).single();
            if (!userData?.is_admin) { alert("Akses Ditolak!"); navigate("/"); return; }

            const { data: allArticles } = await supabase.from("articles").select("status");
            const { count: usersCount } = await supabase.from("users").select("*", { count: 'exact', head: true });

            if (allArticles) {
                setStats({
                    totalArticles: allArticles.length,
                    pendingReviews: allArticles.filter((a) => a.status === "pending").length,
                    publishedArticles: allArticles.filter((a) => a.status === "published" || a.status === "approved").length,
                    totalUsers: usersCount || 0,
                });
            }

            const { data: queueData } = await supabase.from("articles").select("*, users(name), categories(name)").eq("status", "pending").order("created_at", { ascending: false });
            if (queueData) {
                setQueue(queueData);
                if (queueData.length > 0) {
                    setOldestArticle(queueData[queueData.length - 1]);
                } else {
                    setOldestArticle(null);
                }
            }

            const { data: pubData } = await supabase.from("articles").select("*, users(name), categories(name)").in("status", ["published", "approved"]).order("created_at", { ascending: false });
            if (pubData) setPublishedArticles(pubData);

            const { data: arcData } = await supabase.from("articles").select("*, users(name), categories(name)").eq("status", "archived").order("created_at", { ascending: false });
            if (arcData) setArchivedArticles(arcData);

            const { data: catData } = await supabase.from("categories").select("*").order("name");
            if (catData) setCategories(catData);

        } catch (error) { console.error(error.message); } finally { setLoading(false); }
    };

    useEffect(() => { fetchAdminData(); }, [navigate]);

    // EFFECT: Timer SLA (Hanya merah jika sisa waktu <= 12 Jam)
    useEffect(() => {
        if (!oldestArticle) return;

        const updateTimer = () => {
            const createdDate = new Date(oldestArticle.created_at).getTime();
            const now = new Date().getTime();
            const diff = now - createdDate;
            const slaMs = 48 * 60 * 60 * 1000; // SLA 48 Jam
            let remaining = slaMs - diff;

            const elapH = Math.floor(diff / (1000 * 60 * 60));
            setElapsedHours(elapH);

            // Warning hanya menyala jika sisa waktu <= 12 Jam (artinya sudah berlalu 36 jam)
            setIsWarning(remaining <= 12 * 60 * 60 * 1000);

            if (remaining <= 0) {
                setTimeRemaining("00:00:00 (Terlambat)");
                setIsWarning(true);
            } else {
                const h = Math.floor(remaining / (1000 * 60 * 60));
                const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((remaining % (1000 * 60)) / 1000);
                setTimeRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [oldestArticle]);

    // FUNGSI: Tandai Notifikasi Sudah Dibaca
    const handleMarkAsRead = (id) => {
        const updatedReads = [...readNotifs, id];
        setReadNotifs(updatedReads);
        localStorage.setItem('adminReadNotifs', JSON.stringify(updatedReads));
    };

    // Filter antrean khusus untuk Tab Notifikasi
    const filteredNotifsQueue = queue.filter(item =>
        activeNotifTab === "Belum Dibaca" ? !readNotifs.includes(item.id) : readNotifs.includes(item.id)
    );

    // FUNGSI: Buka Modal Edit Admin (Teks + Preview Gambar Lama)
    const openAdminEditModal = (article) => {
        setEditingAdminArticle(article);
        setEditTitle(article.title);
        setEditCategoryId(article.category_id || "");
        setEditContent(article.content);
        setAdminImageFile(null);
        setAdminImagePreview(getImageUrl(article.image));
    };

    // FUNGSI: Tangani File Gambar Admin
    const handleAdminImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Ukuran gambar maksimal 2MB!");
                return;
            }
            setAdminImageFile(file);
            setAdminImagePreview(URL.createObjectURL(file));
        }
    };

    // FUNGSI: Simpan Hasil Edit Admin (Termasuk Upload Gambar ke REACT_NDN)
    const handleSaveAdminEdit = async (e) => {
        e.preventDefault();
        if (!editTitle || !editCategoryId || !editContent) {
            alert("Judul, kategori, dan konten wajib diisi!");
            return;
        }

        setIsSavingEdit(true);
        try {
            let finalImagePath = editingAdminArticle.image;

            // Jika Admin mengunggah gambar baru
            if (adminImageFile) {
                const fileExt = adminImageFile.name.split('.').pop();
                const uniqueFileName = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                const filePath = `articles/${uniqueFileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("REACT_NDN")
                    .upload(filePath, adminImageFile, { cacheControl: '3600', upsert: false });

                if (uploadError) throw new Error("Gagal mengunggah gambar: " + uploadError.message);
                finalImagePath = filePath;
            }

            const { error } = await supabase.from("articles").update({
                title: editTitle,
                category_id: editCategoryId,
                content: editContent,
                image: finalImagePath
            }).eq("id", editingAdminArticle.id);

            if (error) throw error;

            alert("Artikel berhasil diperbarui sesuai standar regulasi!");
            setEditingAdminArticle(null);
            fetchAdminData();
        } catch (error) {
            alert("Gagal memperbarui artikel: " + error.message);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleModeration = async (articleId, newStatus) => {
        setActionLoadingId(articleId);
        try {
            const { data: targetArticle } = await supabase.from("articles").select("title, user_id").eq("id", articleId).single();

            const { error } = await supabase.from("articles").update({ status: newStatus }).eq("id", articleId);
            if (error) throw error;

            if (targetArticle && targetArticle.user_id) {
                const notifTitle = newStatus === "published" ? "Artikel Disetujui" : "Artikel Ditolak";
                const notifBody = newStatus === "published"
                    ? `Kabar baik! Artikel Anda berjudul "${targetArticle.title}" telah disetujui oleh tim editorial dan kini telah dipublikasikan.`
                    : `Mohon maaf, artikel "${targetArticle.title}" belum memenuhi kriteria editorial kami terkait kelengkapan sumber data.`;

                const { error: notifError } = await supabase.from("notifications").insert([{
                    id: crypto.randomUUID(), type: "App\\Notifications\\ArticleStatus", notifiable_type: "App\\Models\\User",
                    notifiable_id: targetArticle.user_id, data: JSON.stringify({ title: notifTitle, body: notifBody, type: newStatus === "published" ? "approved" : "rejected" }),
                    read_at: null
                }]);
                if (notifError) console.error("Gagal menyuntik notifikasi Laravel:", notifError.message);
            }
            await fetchAdminData();
        } catch (error) { alert("Error moderasi: " + error.message); } finally { setActionLoadingId(null); }
    };

    const handleSoftDelete = async (articleId) => {
        if (!window.confirm("Pindahkan artikel ke Arsip publik?")) return;
        handleModeration(articleId, "archived");
    };

    const handleHardDelete = async (articleId) => {
        if (!window.confirm("Hapus permanen dari database?")) return;
        setActionLoadingId(articleId);
        try {
            const { error } = await supabase.from("articles").delete().eq("id", articleId);
            if (error) throw error;
            await fetchAdminData();
        } catch (error) { alert("Gagal menghapus: " + error.message); } finally { setActionLoadingId(null); }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        const slug = newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        try {
            const { error } = await supabase.from("categories").insert([{ name: newCategoryName.trim(), slug: slug }]);
            if (error) throw error;
            setNewCategoryName(""); fetchAdminData(); alert("Kategori berhasil ditambahkan!");
        } catch (error) { alert("Gagal menambah kategori: " + error.message); }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Hapus kategori?")) return;
        try {
            const { error } = await supabase.from("categories").delete().eq("id", id);
            if (error) throw error;
            fetchAdminData(); alert("Kategori berhasil dihapus!");
        } catch (error) { alert("Gagal menghapus kategori: " + error.message); }
    };

    const formatTime = (isoString) => new Date(isoString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    let activeDataList = [];
    if (activeTab === "Antrean Moderasi") activeDataList = queue;
    else if (activeTab === "Manajemen Artikel") activeDataList = publishedArticles;
    else if (activeTab === "Arsip Artikel") activeDataList = archivedArticles;

    const filteredList = activeDataList.filter(item => {
        const q = searchQuery.toLowerCase();
        return (item.title.toLowerCase().includes(q) || (item.users?.name || "").toLowerCase().includes(q));
    });

    const NavButton = ({ label, icon, badge }) => (
        <button onClick={() => { setActiveTab(label); setSearchQuery(""); setIsMobileMenuOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium text-sm transition cursor-pointer ${activeTab === label ? "bg-white text-[#c02626] font-bold shadow-sm" : "text-red-100 hover:bg-red-800/50 hover:text-white"}`}>
            <div className="flex items-center gap-3">{icon}{label}</div>
            {badge !== undefined && badge > 0 && <span className={`${activeTab === label ? "bg-[#c02626] text-white" : "bg-white text-[#c02626]"} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{badge}</span>}
        </button>
    );

    if (loading) return <div className="fixed inset-0 z-50 bg-[#fafafa] flex flex-col items-center justify-center font-sans"><div className="w-12 h-12 border-4 border-t-[#c02626] border-gray-200 rounded-full animate-spin"></div></div>;

    return (
        <div className="fixed inset-0 z-50 flex bg-[#fafafa] font-sans">

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#c02626] text-white flex flex-col shadow-2xl shrink-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static transition-transform duration-300 ease-in-out`}>
                <div className="p-6 pb-8 border-b border-red-800/30 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-serif font-bold tracking-wide">NDN: Admin</h1>
                        <p className="text-[10px] tracking-[0.2em] font-semibold text-red-200 mt-1 uppercase">Workspace</p>
                    </div>
                    <button className="md:hidden text-red-200 hover:text-white p-1" onClick={() => setIsMobileMenuOpen(false)}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
                    <NavButton label="Dashboard" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2v-10z"></path></svg>} />
                    <NavButton label="Antrean Moderasi" badge={stats.pendingReviews} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} />
                    <NavButton label="Notifikasi" badge={stats.pendingReviews - readNotifs.length > 0 ? stats.pendingReviews - readNotifs.length : undefined} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>} />
                    <NavButton label="Manajemen Artikel" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>} />
                    <NavButton label="Arsip Artikel" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>} />
                    <NavButton label="Pengaturan Kategori" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>} />
                    <NavButton label="Manajemen User" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>} />
                </nav>
                <div className="p-4 border-t border-red-800/30">
                    <button onClick={() => navigate("/")} className="w-full flex items-center justify-center md:justify-start gap-3 text-red-200 hover:text-white px-4 py-2.5 rounded-lg font-bold text-sm transition cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        Keluar Dashboard
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">

                <header className="h-[60px] md:h-[72px] bg-white border-b border-gray-200 flex items-center px-4 md:px-8 shrink-0 z-10 gap-3 md:justify-between">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-600 hover:text-gray-900 bg-gray-50 rounded-md border border-gray-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <span className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">{activeTab}</span>
                </header>

                <div className="flex-1 overflow-y-auto bg-[#fafafa]">
                    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">

                        {/* ============================== */}
                        {/* DASHBOARD TAB                  */}
                        {/* ============================== */}
                        {activeTab === "Dashboard" && (
                            <>
                                <h2 className="text-2xl md:text-4xl font-serif font-bold text-gray-900">Selamat datang, Admin 👋</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                    <div className="bg-white rounded-xl p-4 md:p-5 border-l-4 border-l-[#c02626] shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Total Artikel</p><h3 className="text-2xl md:text-3xl font-bold">{stats.totalArticles}</h3></div>
                                    <div className="bg-white rounded-xl p-4 md:p-5 border-l-4 border-l-[#eab308] shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Menunggu Review</p><h3 className="text-2xl md:text-3xl font-bold">{stats.pendingReviews}</h3></div>
                                    <div className="bg-white rounded-xl p-4 md:p-5 border-l-4 border-l-[#22c55e] shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Tayang</p><h3 className="text-2xl md:text-3xl font-bold">{stats.publishedArticles}</h3></div>
                                    <div className="bg-white rounded-xl p-4 md:p-5 border-l-4 border-l-[#3b82f6] shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Pengguna</p><h3 className="text-2xl md:text-3xl font-bold">{stats.totalUsers}</h3></div>
                                </div>
                            </>
                        )}

                        {/* ============================== */}
                        {/* NOTIFIKASI TAB (Hanya Belum & Sudah Dibaca) */}
                        {/* ============================== */}
                        {activeTab === "Notifikasi" && (
                            <div className="space-y-5 md:space-y-6">

                                {/* TABS FILTER BARU */}
                                <div className="flex border-b border-gray-200 text-[11px] md:text-xs font-bold text-gray-500 overflow-x-auto no-scrollbar gap-2 md:gap-4">
                                    <button onClick={() => setActiveNotifTab("Belum Dibaca")} className={`${activeNotifTab === "Belum Dibaca" ? "border-b-2 border-[#c02626] text-[#c02626]" : "hover:text-gray-700"} pb-3 px-3 md:px-4 whitespace-nowrap shrink-0 transition`}>
                                        Belum Dibaca
                                    </button>
                                    <button onClick={() => setActiveNotifTab("Sudah Dibaca")} className={`${activeNotifTab === "Sudah Dibaca" ? "border-b-2 border-[#c02626] text-[#c02626]" : "hover:text-gray-700"} pb-3 px-3 md:px-4 whitespace-nowrap shrink-0 transition`}>
                                        Sudah Dibaca
                                    </button>
                                </div>

                                <div className="space-y-4">

                                    {/* PANEL SLA REAL-TIME (Hanya muncul jika Sisa Waktu <= 12 Jam dan di Tab Belum Dibaca) */}
                                    {activeNotifTab === "Belum Dibaca" && (
                                        !oldestArticle ? (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 shadow-sm border-l-4 border-l-emerald-500">
                                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 self-start">✅</div>
                                                <div className="flex-1 flex flex-col justify-center w-full">
                                                    <h4 className="text-sm font-bold text-gray-900">Antrean Aman Terkendali</h4>
                                                    <p className="text-xs text-emerald-700 mt-1">Tidak ada peringatan. Semua antrean masih dalam batas waktu moderasi aman.</p>
                                                </div>
                                            </div>
                                        ) : isWarning ? (
                                            <div className="bg-[#fff5f5] border border-red-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 shadow-sm border-l-4 border-l-red-500">
                                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-bold shrink-0 self-start">⏰</div>
                                                <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-center gap-3 md:gap-4 w-full">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900">Batas Waktu Moderasi Hampir Habis</h4>
                                                        <p className="text-xs mt-1 text-red-700">
                                                            Artikel "{oldestArticle.title}" telah berada di antrean selama {elapsedHours} jam.
                                                            <span className="font-mono font-bold block sm:inline mt-1 sm:mt-0 sm:ml-1 text-red-800">
                                                                Sisa waktu: {timeRemaining}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <button onClick={() => setActiveTab("Antrean Moderasi")} className="bg-red-700 hover:bg-red-800 text-white text-[10px] md:text-xs font-bold px-4 py-2 rounded shrink-0 cursor-pointer w-full sm:w-auto transition shadow-sm">
                                                        Proses Sekarang →
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 shadow-sm border-l-4 border-l-blue-500">
                                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0 self-start">ℹ️</div>
                                                <div className="flex-1 flex flex-col justify-center w-full">
                                                    <h4 className="text-sm font-bold text-gray-900">Info Antrean Redaksi</h4>
                                                    <p className="text-xs text-blue-700 mt-1">Artikel "{oldestArticle.title}" adalah yang paling lama di antrean ({elapsedHours} jam). Masih cukup waktu untuk moderasi santai.</p>
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {/* LIST NOTIFIKASI */}
                                    {filteredNotifsQueue.length === 0 ? (
                                        <div className="bg-white border border-dashed rounded-xl p-8 md:p-12 text-center text-gray-400 text-sm">
                                            Tidak ada notifikasi di folder ini.
                                        </div>
                                    ) : (
                                        filteredNotifsQueue.map(item => (
                                            <div key={item.id} className={`${activeNotifTab === "Belum Dibaca" ? "bg-white border-blue-200 border-l-blue-500 hover:shadow-md" : "bg-gray-50 border-gray-200 border-l-gray-400 opacity-70"} border rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 shadow-sm border-l-4 transition`}>
                                                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-bold shrink-0 self-start ${activeNotifTab === "Belum Dibaca" ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-500"}`}>📝</div>
                                                <div className="flex-1 space-y-2 w-full">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                                        <h4 className="text-sm font-bold text-gray-900 leading-snug">Berita Baru Menunggu Moderasi</h4>
                                                        <span className="text-[10px] text-gray-400 shrink-0">{formatTime(item.created_at)}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-600">Artikel "<span className="font-bold">{item.title}</span>" dari @{item.users?.name || "anonim"} masuk ke dalam antrean. Silakan periksa di tab Antrean Moderasi.</p>

                                                    {/* TOMBOL SUDAH DIBACA */}
                                                    {activeNotifTab === "Belum Dibaca" && (
                                                        <div className="pt-2">
                                                            <button onClick={() => handleMarkAsRead(item.id)} className="bg-gray-100 border border-gray-200 text-gray-600 font-bold text-[10px] md:text-[11px] px-3 py-1.5 rounded hover:bg-gray-200 transition cursor-pointer flex items-center gap-1.5 w-fit">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                                Tandai Sudah Dibaca
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ============================== */}
                        {/* ANTREAN MODERASI TAB           */}
                        {/* ============================== */}
                        {activeTab === "Antrean Moderasi" && (
                            <div className="space-y-4">
                                <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-2 mb-4">
                                    <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari judul artikel atau nama penulis di antrean..." className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400" />
                                </div>

                                {filteredList.length === 0 ? (
                                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                                        <p className="text-gray-500 font-medium">✨ Antrean kosong. Tidak ada artikel yang perlu direview.</p>
                                    </div>
                                ) : (
                                    filteredList.map(item => (
                                        <div key={item.id} className="bg-white border border-amber-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-4 shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition">

                                            {/* Thumbnail Kecil (Opsional agar admin bisa intip gambar) */}
                                            <div className="w-full sm:w-32 h-24 shrink-0 rounded border border-gray-100 bg-gray-50 overflow-hidden">
                                                <img src={getImageUrl(item.image)} alt="thumbnail" className="w-full h-full object-cover opacity-80" />
                                            </div>

                                            <div className="flex-1 space-y-1.5 w-full">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-2">
                                                    <h4 className="text-base md:text-lg font-bold text-gray-900 leading-snug">{item.title}</h4>
                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded shrink-0">{formatTime(item.created_at)}</span>
                                                </div>
                                                <p className="text-xs md:text-sm text-gray-600 mb-2">Penulis: <span className="font-bold text-gray-800">@{item.users?.name || "anonim"}</span> | Kategori: <span className="font-bold text-gray-800">{item.categories?.name || "UMUM"}</span></p>

                                                <div className="pt-4 mt-2 border-t border-gray-100 flex flex-wrap gap-2">
                                                    <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "published")} className="flex-1 sm:flex-none bg-emerald-600 text-white font-bold text-[11px] md:text-xs px-4 py-2 rounded hover:bg-emerald-700 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Setujui
                                                    </button>
                                                    <button disabled={actionLoadingId === item.id} onClick={() => openAdminEditModal(item)} className="flex-1 sm:flex-none bg-blue-600 text-white font-bold text-[11px] md:text-xs px-4 py-2 rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> Edit Total
                                                    </button>
                                                    <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "rejected")} className="flex-1 sm:flex-none bg-red-600 text-white font-bold text-[11px] md:text-xs px-4 py-2 rounded hover:bg-red-700 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg> Tolak
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ============================== */}
                        {/* TABEL MANAJEMEN & ARSIP        */}
                        {/* ============================== */}
                        {(activeTab === "Manajemen Artikel" || activeTab === "Arsip Artikel") && (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-full">
                                <div className="bg-white p-3 border-b border-gray-200 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Cari di ${activeTab}...`} className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400" />
                                </div>
                                <div className="overflow-x-auto no-scrollbar w-full">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] font-bold text-gray-500 uppercase w-1/2">Judul Artikel</th>
                                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] font-bold text-gray-500 uppercase">Penulis</th>
                                                <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] font-bold text-gray-500 uppercase text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredList.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="px-4 md:px-6 py-4">
                                                        <p className="text-xs md:text-sm font-bold truncate max-w-[200px] md:max-w-xs">{item.title}</p>
                                                        <p className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">{formatTime(item.created_at)}</p>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4"><span className="text-xs md:text-sm font-medium text-gray-700">{item.users?.name || "Anonim"}</span></td>
                                                    <td className="px-4 md:px-6 py-4 text-right">
                                                        {activeTab === "Manajemen Artikel" && <button onClick={() => handleSoftDelete(item.id)} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-[10px] md:text-xs font-bold rounded border border-orange-200 cursor-pointer whitespace-nowrap">Arsipkan</button>}
                                                        {activeTab === "Arsip Artikel" && <button onClick={() => handleHardDelete(item.id)} className="px-3 py-1.5 bg-red-50 text-red-700 text-[10px] md:text-xs font-bold rounded border border-red-200 cursor-pointer whitespace-nowrap">Hard Delete</button>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === "Pengaturan Kategori" && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                                <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm h-fit">
                                    <h3 className="font-serif font-bold text-base md:text-lg mb-4">Tambah Kategori</h3>
                                    <form onSubmit={handleAddCategory} className="space-y-4">
                                        <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nama Kategori" className="w-full border py-2.5 md:py-2 px-3 text-sm rounded-md focus:outline-none focus:border-red-500" required />
                                        <button type="submit" className="w-full bg-[#c02626] text-white py-2.5 rounded font-bold text-sm cursor-pointer">Simpan</button>
                                    </form>
                                </div>
                                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                    <ul className="divide-y divide-gray-100">
                                        {categories.map(cat => (
                                            <li key={cat.id} className="flex justify-between items-center p-4 md:p-5">
                                                <div><p className="font-bold text-sm md:text-base text-gray-800">{cat.name}</p></div>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 md:p-2 rounded text-[10px] md:text-xs font-bold border border-red-100 cursor-pointer transition">Hapus</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {activeTab === "Manajemen User" && <div className="bg-white border border-dashed rounded-xl p-8 md:p-12 text-center text-gray-400 text-sm">Modul Manajemen Pengguna sedang dipersiapkan.</div>}

                    </div>
                </div>
            </main>

            {/* ========================================== */}
            {/* MODAL EDIT ARTIKEL (TEKS & GAMBAR)         */}
            {/* ========================================== */}
            {editingAdminArticle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingAdminArticle(null)}></div>

                    <div className="relative bg-white w-full max-w-3xl max-h-[90vh] md:max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900">Edit Artikel (Akses Admin)</h2>
                            <button onClick={() => setEditingAdminArticle(null)} className="text-gray-400 hover:text-red-500 transition cursor-pointer p-1">
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="p-4 md:p-6 overflow-y-auto flex-1">
                            <form id="adminEditForm" onSubmit={handleSaveAdminEdit} className="space-y-4 md:space-y-5">

                                {/* AREA UPLOAD GAMBAR BARU */}
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">Ganti Gambar Utama (Opsional)</label>
                                    <div className="relative border-2 border-dashed border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 transition cursor-pointer flex flex-col items-center justify-center p-4 min-h-[120px] overflow-hidden text-center">
                                        <input
                                            type="file"
                                            accept="image/png, image/jpeg, image/jpg, image/webp"
                                            onChange={handleAdminImageChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />

                                        {adminImagePreview ? (
                                            <div className="flex flex-col items-center z-0 w-full h-full">
                                                <img src={adminImagePreview} alt="Preview" className="h-24 md:h-32 w-auto object-contain rounded mb-2 shadow-sm border border-gray-200" />
                                                <span className="text-[10px] font-bold text-[#bd2828] bg-white px-3 py-1 rounded-full shadow-sm">Ubah Gambar</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-500 z-0">
                                                <svg className="w-6 h-6 md:w-8 md:h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                                <p className="text-[11px] md:text-xs font-medium text-gray-700">Klik atau Drag & Drop gambar baru</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">Judul Berita</label>
                                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-2.5 md:py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828]" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">Kategori</label>
                                    <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-2.5 md:py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828]" required>
                                        <option value="">Pilih Kategori</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">Isi Konten Berita</label>
                                    <textarea rows="6" value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-3 px-3.5 md:px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828] resize-y min-h-[120px] md:min-h-[150px]" required></textarea>
                                </div>
                            </form>
                        </div>

                        <div className="p-4 md:p-5 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3">
                            <button type="button" onClick={() => setEditingAdminArticle(null)} className="w-full sm:w-auto px-5 py-2.5 md:py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded transition cursor-pointer text-center">Batal</button>
                            <button form="adminEditForm" type="submit" disabled={isSavingEdit} className="w-full sm:w-auto px-5 py-2.5 md:py-2 text-sm font-bold bg-[#1d4ed8] text-white hover:bg-blue-800 rounded transition shadow cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}