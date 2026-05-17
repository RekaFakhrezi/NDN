import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [activeTab, setActiveTab] = useState("Semua");
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { navigate("/login"); return; }

            const { data: userData } = await supabase.from("users").select("id").eq("email", session.user.email).single();
            if (!userData) return;
            setCurrentUserId(userData.id);

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("notifiable_id", userData.id)
                .eq("notifiable_type", "App\\Models\\User")
                .order("created_at", { ascending: false });

            if (error) throw error;
            if (data) setNotifications(data);
        } catch (error) {
            console.error("Error notifikasi:", error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [navigate]);

    const handleMarkAllRead = async () => {
        if (notifications.length === 0) return;
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ read_at: new Date().toISOString() })
                .eq("notifiable_id", currentUserId)
                .eq("notifiable_type", "App\\Models\\User");

            if (error) throw error;
            fetchNotifications();
        } catch (error) { console.error(error.message); }
    };

    const handleClearAll = async () => {
        if (!window.confirm("Hapus semua riwayat notifikasi Anda?")) return;
        try {
            const { error } = await supabase.from("notifications").delete().eq("notifiable_id", currentUserId).eq("notifiable_type", "App\\Models\\User");
            if (error) throw error;
            setNotifications([]);
        } catch (error) { console.error(error.message); }
    };

    const handleToggleReadSingle = async (id, isRead) => {
        try {
            const newReadAt = isRead ? null : new Date().toISOString();
            await supabase.from("notifications").update({ read_at: newReadAt }).eq("id", id);
            fetchNotifications();
        } catch (error) { console.error(error.message); }
    };

    const filteredNotifs = notifications.filter(n => {
        const isRead = n.read_at !== null;
        if (activeTab === "Semua") return true;
        if (activeTab === "Belum Dibaca") return !isRead;
        return isRead;
    });

    const unreadCount = notifications.filter(n => n.read_at === null).length;

    const formatTimeAgo = (isoString) => {
        const diff = Date.now() - new Date(isoString).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        if (mins < 60) return `${mins} menit yang lalu`;
        if (hours < 24) return `${hours} jam yang lalu`;
        return `${days} hari yang lalu`;
    };

    if (loading) return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center"><div className="w-10 h-10 border-4 border-t-[#bd2828] border-gray-200 rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-[#fafafa] pb-20 pt-6 md:pt-8 font-sans">
            {/* Padding container dikondisikan agar luwes di mobile (px-4 ke px-6) */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* TOP CONTROLS BAR (Otomatis menumpuk vertikal di HP) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">Pusat Notifikasi</h1>
                        <p className="text-xs text-gray-500 mt-1">Pantau status artikel dan aktivitas akunmu</p>
                    </div>
                    {/* Tombol aksi melebar penuh di mobile agar mudah ditekan jari */}
                    <div className="flex items-center gap-2 w-full sm:w-auto text-[11px] md:text-xs font-bold shrink-0">
                        <button onClick={handleMarkAllRead} className="flex-1 sm:flex-none text-center border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap">✓ ✓ Baca Semua</button>
                        <button onClick={handleClearAll} className="flex-1 sm:flex-none text-center border border-gray-300 bg-white text-gray-500 px-3 py-2 rounded shadow-sm hover:bg-red-50 hover:text-red-700 cursor-pointer whitespace-nowrap">🗑️ Hapus Semua</button>
                    </div>
                </div>

                {/* TABS NAVIGASI FILTER (Bisa di-swipe geser kesamping jika resolusi layar sempit) */}
                <div className="flex border-b border-gray-200 mb-6 text-sm font-bold overflow-x-auto whitespace-nowrap no-scrollbar">
                    {["Semua", "Belum Dibaca", "Sudah Dibaca"].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 relative cursor-pointer transition shrink-0 ${activeTab === tab ? "text-[#bd2828]" : "text-gray-500"}`}>
                            {tab}
                            {tab === "Belum Dibaca" && unreadCount > 0 && <span className="ml-1.5 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full inline-block align-middle">{unreadCount}</span>}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#bd2828]"></div>}
                        </button>
                    ))}
                </div>

                {/* LIST ROW CARDS NOTIFIKASI */}
                <div className="space-y-4">
                    {filteredNotifs.map(n => {
                        let payload = { title: "Notifikasi Sistem", body: "", type: "system" };
                        try {
                            payload = typeof n.data === "string" ? JSON.parse(n.data) : n.data;
                        } catch (e) { console.error(e); }

                        const isRead = n.read_at !== null;

                        return (
                            /* Padding dalam mengecil jadi p-4 di HP agar ruang teks maksimal */
                            <div key={n.id} className={`border border-gray-200 rounded-xl p-4 sm:p-5 flex gap-3 sm:gap-4 transition shadow-sm bg-white relative ${!isRead ? "border-l-4 border-l-blue-500" : ""}`}>

                                {/* Bulatan Avatar Icon Tipe Notif */}
                                <div className="shrink-0">
                                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${payload.type === "approved" ? "bg-green-100 text-green-700" :
                                            payload.type === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                        }`}>
                                        {payload.type === "approved" ? "✓" : payload.type === "rejected" ? "✕" : "💬"}
                                    </div>
                                </div>

                                {/* Deskripsi Pesan Text */}
                                <div className="flex-1 space-y-1.5 min-w-0">
                                    {/* Header info notif otomatis bertumpuk di HP agar teks tanggal tidak tabrakan */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <h4 className="text-sm font-bold text-gray-900 flex flex-wrap items-center gap-1.5">
                                            <span className="truncate max-w-[200px] sm:max-w-none" title={payload.title}>{payload.title}</span>
                                            {payload.type === "rejected" && <span className="bg-red-100 text-red-800 text-[8px] px-1.5 py-0.5 rounded font-extrabold tracking-wider uppercase shrink-0">Revisi</span>}
                                        </h4>
                                        <span className="text-[10px] text-gray-400 font-medium shrink-0">{formatTimeAgo(n.created_at)}</span>
                                    </div>

                                    <p className="text-xs text-gray-600 leading-relaxed pr-6 break-words">{payload.body}</p>

                                    {/* Container Tombol Aksi Bawah ( flex-wrap mencegah tombol jebol keluar layar) */}
                                    <div className="pt-2 flex flex-wrap gap-2">
                                        {payload.type === "approved" && <Link to="/my-articles" className="bg-[#bd2828] text-white font-bold text-[10px] px-3.5 py-1.5 rounded shadow-sm hover:bg-red-800 transition text-center">Lihat Artikel</Link>}
                                        {payload.type === "rejected" && (
                                            <>
                                                <Link to="/my-articles" className="bg-[#bd2828] text-white font-bold text-[10px] px-3.5 py-1.5 rounded shadow-sm hover:bg-red-800 transition text-center">Lihat Alasan</Link>
                                                <Link to="/my-articles" className="bg-white border border-gray-300 text-gray-700 font-bold text-[10px] px-3.5 py-1.5 rounded hover:bg-gray-50 transition text-center">Edit Draft</Link>
                                            </>
                                        )}
                                        {payload.type === "comment" && <Link to="/my-articles" className="bg-white border border-gray-300 text-blue-700 border-blue-200 font-bold text-[10px] px-3.5 py-1.5 rounded hover:bg-blue-50 transition text-center">Baca Sekarang</Link>}
                                    </div>
                                </div>

                                {/* Bulatan Indikator Status Baca Pojok Kanan Atas */}
                                {/* Posisi digeser sedikit agar pas dengan kompresi mobile layout */}
                                <button onClick={() => handleToggleReadSingle(n.id, isRead)} className="absolute top-4 right-4 w-2 h-2 rounded-full cursor-pointer transition shadow-sm" title={isRead ? "Tandai belum dibaca" : "Tandai sudah dibaca"} style={{ backgroundColor: isRead ? "#d1d5db" : "#ef4444" }}></button>

                            </div>
                        );
                    })}

                    {filteredNotifs.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 font-medium text-sm">📭 Kotak masuk notifikasi Anda bersih melompong!</div>
                    )}
                </div>

            </div>
        </div>
    );
}