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

    // STATE BARU: Mengontrol sidebar drawer di layar HP
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navigate = useNavigate();

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
            if (queueData) setQueue(queueData);

            const { data: pubData } = await supabase.from("articles").select("*, users(name), categories(name)").in("status", ["published", "approved"]).order("created_at", { ascending: false });
            if (pubData) setPublishedArticles(pubData);

            const { data: arcData } = await supabase.from("articles").select("*, users(name), categories(name)").eq("status", "archived").order("created_at", { ascending: false });
            if (arcData) setArchivedArticles(arcData);

            const { data: catData } = await supabase.from("categories").select("*").order("name");
            if (catData) setCategories(catData);

        } catch (error) { console.error(error.message); } finally { setLoading(false); }
    };

    useEffect(() => { fetchAdminData(); }, [navigate]);

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

                const { error: notifError } = await supabase.from("notifications").insert([
                    {
                        id: crypto.randomUUID(),
                        type: "App\\Notifications\\ArticleStatus",
                        notifiable_type: "App\\Models\\User",
                        notifiable_id: targetArticle.user_id,
                        data: JSON.stringify({
                            title: notifTitle,
                            body: notifBody,
                            type: newStatus === "published" ? "approved" : "rejected"
                        }),
                        read_at: null
                    }
                ]);

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
            await supabase.from("articles").delete().eq("id", articleId);
            await fetchAdminData();
        } catch (error) { alert(error.message); } finally { setActionLoadingId(null); }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        const slug = newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        try {
            await supabase.from("categories").insert([{ name: newCategoryName.trim(), slug: slug }]);
            setNewCategoryName(""); fetchAdminData();
        } catch (error) { alert(error.message); }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Hapus kategori?")) return;
        try { await supabase.from("categories").delete().eq("id", id); fetchAdminData(); } catch (error) { alert(error.message); }
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
            {badge !== undefined && <span className={`${activeTab === label ? "bg-[#c02626] text-white" : "bg-white text-[#c02626]"} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{badge}</span>}
        </button>
    );

    if (loading) return <div className="fixed inset-0 z-50 bg-[#fafafa] flex flex-col items-center justify-center font-sans"><div className="w-12 h-12 border-4 border-t-[#c02626] border-gray-200 rounded-full animate-spin"></div></div>;

    return (
        <div className="fixed inset-0 z-50 flex bg-[#fafafa] font-sans">

            {/* OVERLAY GELAP UNTUK MOBILE (Klik di luar menu untuk tutup) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* SIDEBAR (Drawer Responsive) */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#c02626] text-white flex flex-col shadow-2xl shrink-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static transition-transform duration-300 ease-in-out`}>
                <div className="p-6 pb-8 border-b border-red-800/30 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-serif font-bold tracking-wide">NDN: Admin</h1>
                        <p className="text-[10px] tracking-[0.2em] font-semibold text-red-200 mt-1 uppercase">Workspace</p>
                    </div>
                    {/* Tombol Tutup Silang di Mobile */}
                    <button className="md:hidden text-red-200 hover:text-white p-1" onClick={() => setIsMobileMenuOpen(false)}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
                    <NavButton label="Dashboard" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2v-10z"></path></svg>} />
                    <NavButton label="Antrean Moderasi" badge={stats.pendingReviews} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} />
                    <NavButton label="Notifikasi" badge={stats.pendingReviews} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>} />
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

            {/* MAIN DATA PANELS */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">

                <header className="h-[60px] md:h-[72px] bg-white border-b border-gray-200 flex items-center px-4 md:px-8 shrink-0 z-10 gap-3 md:justify-between">
                    {/* Hamburger Toggle (Hanya di Mobile) */}
                    <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-gray-600 hover:text-gray-900 bg-gray-50 rounded-md border border-gray-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <span className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">{activeTab}</span>
                </header>

                <div className="flex-1 overflow-y-auto bg-[#fafafa]">
                    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">

                        {/* VIEW: DASHBOARD */}
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

                        {/* VIEW: WORKSPACE PUSAT NOTIFIKASI ADMIN */}
                        {activeTab === "Notifikasi" && (
                            <div className="space-y-5 md:space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                                    <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-100 shadow-sm border-l-4 border-l-red-600"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Notifikasi</p><h3 className="text-xl md:text-2xl font-bold mt-1">{stats.pendingReviews + 1}</h3></div>
                                    <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-100 shadow-sm border-l-4 border-l-amber-500"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Belum Ditindak</p><h3 className="text-xl md:text-2xl font-bold mt-1">{stats.pendingReviews}</h3></div>
                                    <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-100 shadow-sm border-l-4 border-l-emerald-500"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sudah Ditindak</p><h3 className="text-xl md:text-2xl font-bold mt-1">1,206</h3></div>
                                </div>

                                <div className="flex border-b border-gray-200 text-[11px] md:text-xs font-bold text-gray-500 overflow-x-auto no-scrollbar gap-2 md:gap-4">
                                    <button className="border-b-2 border-[#c02626] text-[#c02626] pb-3 px-3 md:px-4 whitespace-nowrap shrink-0">Semua</button>
                                    <button className="pb-3 px-3 md:px-4 whitespace-nowrap shrink-0">Belum Dibaca</button>
                                    <button className="pb-3 px-3 md:px-4 whitespace-nowrap shrink-0">Artikel Baru</button>
                                </div>

                                <div className="space-y-4">
                                    {queue.map(item => (
                                        <div key={item.id} className="bg-[#fdfaf6] border border-amber-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 shadow-sm border-l-4 border-l-amber-500">
                                            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 self-start">📋</div>
                                            <div className="flex-1 space-y-1.5 w-full">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                                    <h4 className="text-sm font-bold text-gray-900 leading-snug">Artikel Baru Masuk: "{item.title}"</h4>
                                                    <span className="text-[10px] text-gray-400 shrink-0">{formatTime(item.created_at)}</span>
                                                </div>
                                                <p className="text-xs text-gray-600">Penulis: <span className="font-bold">@{item.users?.name || "anonim"}</span> | Kategori: {item.categories?.name || "UMUM"}. Menunggu tinjauan editor untuk publikasi.</p>
                                                <div className="pt-2 flex flex-wrap gap-2">
                                                    <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "published")} className="flex-1 sm:flex-none bg-emerald-600 text-white font-bold text-[10px] md:text-xs px-4 py-2 sm:py-1.5 rounded hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Setujui</button>
                                                    <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "rejected")} className="flex-1 sm:flex-none bg-red-600 text-white font-bold text-[10px] md:text-xs px-4 py-2 sm:py-1.5 rounded hover:bg-red-700 cursor-pointer disabled:opacity-50">Tolak</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="bg-[#fff5f5] border border-red-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 shadow-sm border-l-4 border-l-red-500">
                                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-bold shrink-0 self-start">⏰</div>
                                        <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-center gap-3 md:gap-4 w-full">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">Batas Waktu Moderasi Hampir Habis</h4>
                                                <p className="text-xs text-red-700 mt-1">Artikel investigasi "Kasus Lahan Hijau" telah berada di antrean selama 46 jam. <span className="font-mono font-bold block sm:inline mt-1 sm:mt-0 sm:ml-1">Sisa waktu: 02:14:33</span></p>
                                            </div>
                                            <button onClick={() => setActiveTab("Antrean Moderasi")} className="bg-red-700 text-white text-[10px] md:text-xs font-bold px-4 py-2 rounded hover:bg-red-800 shrink-0 cursor-pointer w-full sm:w-auto">Proses Sekarang →</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VIEW TABEL LIST (Dibuat Scrollable Horizontal) */}
                        {(activeTab === "Antrean Moderasi" || activeTab === "Manajemen Artikel" || activeTab === "Arsip Artikel") && (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-full">
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
                                                        {activeTab === "Antrean Moderasi" && (
                                                            <div className="flex justify-end gap-2">
                                                                <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "published")} className="px-2.5 py-1.5 md:px-3 md:py-1 bg-emerald-600 text-white text-[10px] md:text-xs font-bold rounded cursor-pointer">Setujui</button>
                                                                <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "rejected")} className="px-2.5 py-1.5 md:px-3 md:py-1 bg-red-600 text-white text-[10px] md:text-xs font-bold rounded cursor-pointer">Tolak</button>
                                                            </div>
                                                        )}
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

                        {/* TAB VIEW KATEGORI */}
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
        </div>
    );
}