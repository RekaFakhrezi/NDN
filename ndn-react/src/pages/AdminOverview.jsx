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

            // SINKRONISASI KOMPATIBILITAS LARAVEL NOTIFICATIONS TABLE
            if (targetArticle && targetArticle.user_id) {
                const notifTitle = newStatus === "published" ? "Artikel Disetujui" : "Artikel Ditolak";
                const notifBody = newStatus === "published"
                    ? `Kabar baik! Artikel Anda berjudul "${targetArticle.title}" telah disetujui oleh tim editorial dan kini telah dipublikasikan.`
                    : `Mohon maaf, artikel "${targetArticle.title}" belum memenuhi kriteria editorial kami terkait kelengkapan sumber data.`;

                const { error: notifError } = await supabase.from("notifications").insert([
                    {
                        id: crypto.randomUUID(), // Membuat UUID manual dari frontend
                        type: "App\\Notifications\\ArticleStatus",
                        notifiable_type: "App\\Models\\User",
                        notifiable_id: targetArticle.user_id, // Kolom pengganti user_id
                        data: JSON.stringify({
                            title: notifTitle,
                            body: notifBody,
                            type: newStatus === "published" ? "approved" : "rejected"
                        }), // Dibungkus format JSON teks
                        read_at: null // NULL melambangkan belum dibaca
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

    const getInitials = (name) => {
        if (!name) return "A";
        const words = name.trim().split(" ");
        return words.length === 1 ? words[0].substring(0, 2).toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
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
        <button onClick={() => { setActiveTab(label); setSearchQuery(""); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium text-sm transition cursor-pointer ${activeTab === label ? "bg-white text-[#c02626] font-bold shadow-sm" : "text-red-100 hover:bg-red-800/50 hover:text-white"}`}>
            <div className="flex items-center gap-3">{icon}{label}</div>
            {badge !== undefined && <span className={`${activeTab === label ? "bg-[#c02626] text-white" : "bg-white text-[#c02626]"} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{badge}</span>}
        </button>
    );

    if (loading) return <div className="fixed inset-0 z-50 bg-[#fafafa] flex flex-col items-center justify-center font-sans"><div className="w-12 h-12 border-4 border-t-[#c02626] border-gray-200 rounded-full animate-spin"></div></div>;

    return (
        <div className="fixed inset-0 z-50 flex bg-[#fafafa] font-sans">
            <aside className="w-64 bg-[#c02626] text-white flex flex-col shadow-xl z-20 shrink-0">
                <div className="p-6 pb-8 border-b border-red-800/30"><h1 className="text-2xl font-serif font-bold tracking-wide">NDN: Admin</h1><p className="text-[10px] tracking-[0.2em] font-semibold text-red-200 mt-1 uppercase">Workspace</p></div>
                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                    <NavButton label="Dashboard" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2v-10z"></path></svg>} />
                    <NavButton label="Antrean Moderasi" badge={stats.pendingReviews} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} />
                    <NavButton label="Notifikasi" badge={stats.pendingReviews} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>} />
                    <NavButton label="Manajemen Artikel" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>} />
                    <NavButton label="Arsip Artikel" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>} />
                    <NavButton label="Pengaturan Kategori" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>} />
                    <NavButton label="Manajemen User" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>} />
                </nav>
                <div className="p-4 border-t border-red-800/30"><button onClick={() => navigate("/")} className="w-full flex items-center gap-3 text-red-200 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>Keluar Dashboard</button></div>
            </aside>

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{activeTab}</span>
                </header>

                <div className="flex-1 overflow-y-auto bg-[#fafafa]">
                    <div className="p-8 max-w-7xl mx-auto space-y-8">

                        {activeTab === "Dashboard" && (
                            <>
                                <h2 className="text-4xl font-serif font-bold text-gray-900">Selamat datang, Admin 👋</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white rounded-xl p-5 border-l-4 border-l-[#c02626] shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Total Artikel</p><h3 className="text-3xl font-bold">{stats.totalArticles}</h3></div>
                                    <div className="bg-white rounded-xl p-5 border-l-4 border-l-[#eab308] shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Menunggu Review</p><h3 className="text-3xl font-bold">{stats.pendingReviews}</h3></div>
                                    <div className="bg-white rounded-xl p-5 border-l-4 border-l-[#22c55e] shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Tayang</p><h3 className="text-3xl font-bold">{stats.publishedArticles}</h3></div>
                                    <div className="bg-white rounded-xl p-5 border-l-4 border-l-[#3b82f6] shadow-sm"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Pengguna</p><h3 className="text-3xl font-bold">{stats.totalUsers}</h3></div>
                                </div>
                            </>
                        )}

                        {activeTab === "Notifikasi" && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-l-4 border-l-red-600"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Notifikasi</p><h3 className="text-2xl font-bold mt-1">{stats.pendingReviews + 1}</h3></div>
                                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-l-4 border-l-amber-500"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Belum Ditindak</p><h3 className="text-2xl font-bold mt-1">{stats.pendingReviews}</h3></div>
                                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm border-l-4 border-l-emerald-500"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sudah Ditindak</p><h3 className="text-2xl font-bold mt-1">1,206</h3></div>
                                </div>

                                <div className="flex border-b border-gray-200 text-xs font-bold text-gray-500 gap-2">
                                    <button className="border-b-2 border-[#c02626] text-[#c02626] pb-3 px-4">Semua</button>
                                    <button className="pb-3 px-4">Belum Dibaca</button>
                                    <button className="pb-3 px-4">Artikel Baru</button>
                                </div>

                                <div className="space-y-4">
                                    {queue.map(item => (
                                        <div key={item.id} className="bg-[#fdfaf6] border border-amber-200 rounded-xl p-5 flex gap-4 shadow-sm border-l-4 border-l-amber-500">
                                            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">📋</div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-sm font-bold text-gray-900">Artikel Baru Masuk: "{item.title}"</h4>
                                                    <span className="text-[10px] text-gray-400">{formatTime(item.created_at)}</span>
                                                </div>
                                                <p className="text-xs text-gray-600">Penulis: <span className="font-bold">@{item.users?.name || "anonim"}</span> | Kategori: {item.categories?.name || "UMUM"}. Menunggu tinjauan editor untuk publikasi.</p>
                                                <div className="pt-3 flex gap-2">
                                                    <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "published")} className="bg-emerald-600 text-white font-bold text-[10px] px-4 py-1.5 rounded hover:bg-emerald-700 cursor-pointer disabled:opacity-50">Setujui</button>
                                                    <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "rejected")} className="bg-red-600 text-white font-bold text-[10px] px-4 py-1.5 rounded hover:bg-red-700 cursor-pointer disabled:opacity-50">Tolak</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}


                                </div>
                            </div>
                        )}

                        {(activeTab === "Antrean Moderasi" || activeTab === "Manajemen Artikel" || activeTab === "Arsip Artikel") && (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Judul Artikel</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">Penulis</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredList.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4"><p className="text-sm font-bold truncate max-w-xs">{item.title}</p><p className="text-[10px] text-gray-400">{formatTime(item.created_at)}</p></td>
                                                    <td className="px-6 py-4"><span className="text-sm font-medium text-gray-700">{item.users?.name || "Anonim"}</span></td>
                                                    <td className="px-6 py-4 text-right">
                                                        {activeTab === "Antrean Moderasi" && (
                                                            <div className="flex justify-end gap-2">
                                                                <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "published")} className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded cursor-pointer">Setujui</button>
                                                                <button disabled={actionLoadingId === item.id} onClick={() => handleModeration(item.id, "rejected")} className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded cursor-pointer">Tolak</button>
                                                            </div>
                                                        )}
                                                        {activeTab === "Manajemen Artikel" && <button onClick={() => handleSoftDelete(item.id)} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-bold rounded border border-orange-200 cursor-pointer">Arsipkan</button>}
                                                        {activeTab === "Arsip Artikel" && <button onClick={() => handleHardDelete(item.id)} className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-200 cursor-pointer">Hard Delete</button>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === "Pengaturan Kategori" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"><h3 className="font-serif font-bold text-lg mb-4">Tambah Kategori</h3><form onSubmit={handleAddCategory} className="space-y-4"><input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nama Kategori" className="w-full border py-2 px-3 text-sm rounded-md" required /><button type="submit" className="w-full bg-[#c02626] text-white py-2.5 rounded font-bold text-sm cursor-pointer">Simpan</button></form></div>
                                <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm"><ul className="divide-y divide-gray-100">{categories.map(cat => <li key={cat.id} className="flex justify-between items-center p-4"><div><p className="font-bold">{cat.name}</p></div><button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 bg-red-50 p-2 rounded cursor-pointer">Hapus</button></li>)}</ul></div>
                            </div>
                        )}

                        {activeTab === "Manajemen User" && <div className="bg-white border border-dashed rounded-xl p-12 text-center text-gray-400">Modul Manajemen Pengguna sedang dipersiapkan.</div>}

                    </div>
                </div>
            </main>
        </div>
    );
}