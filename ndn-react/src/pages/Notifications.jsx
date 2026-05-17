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
        fetchNotifications(); // Typo teks asing sudah dibersihkan total disini
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
        <div className="min-h-screen bg-[#fafafa] pb-20 pt-8 font-sans">
            <div className="max-w-4xl mx-auto px-6">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-gray-900">Pusat Notifikasi</h1>
                        <p className="text-xs text-gray-500 mt-1">Pantau status artikel dan aktivitas akunmu</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold">
                        <button onClick={handleMarkAllRead} className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 cursor-pointer">✓ ✓ Tandai Semua Dibaca</button>
                        <button onClick={handleClearAll} className="border border-gray-300 bg-white text-gray-500 px-4 py-2 rounded shadow-sm hover:bg-red-50 hover:text-red-700 cursor-pointer">🗑️ Hapus Semua</button>
                    </div>
                </div>

                <div className="flex flex-wrap border-b border-gray-200 mb-6 text-sm font-bold">
                    {["Semua", "Belum Dibaca", "Sudah Dibaca"].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 relative cursor-pointer transition ${activeTab === tab ? "text-[#bd2828]" : "text-gray-500"}`}>
                            {tab}
                            {tab === "Belum Dibaca" && unreadCount > 0 && <span className="ml-1.5 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#bd2828]"></div>}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {filteredNotifs.map(n => {
                        let payload = { title: "Notifikasi Sistem", body: "", type: "system" };
                        try {
                            payload = typeof n.data === "string" ? JSON.parse(n.data) : n.data;
                        } catch (e) { console.error(e); }

                        const isRead = n.read_at !== null;

                        return (
                            <div key={n.id} className={`border border-gray-200 rounded-xl p-5 flex gap-4 transition shadow-sm bg-white relative ${!isRead ? "border-l-4 border-l-blue-500" : ""}`}>
                                <div className="shrink-0">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${payload.type === "approved" ? "bg-green-100 text-green-700" :
                                            payload.type === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                        }`}>
                                        {payload.type === "approved" ? "✓" : payload.type === "rejected" ? "✕" : "💬"}
                                    </div>
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            {payload.title}
                                            {payload.type === "rejected" && <span className="bg-red-100 text-red-800 text-[9px] px-2 py-0.5 rounded font-extrabold tracking-wider uppercase">Perlu Revisi</span>}
                                        </h4>
                                        <span className="text-[10px] text-gray-400 font-medium">{formatTimeAgo(n.created_at)}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed pr-10">{payload.body}</p>

                                    <div className="pt-3 flex gap-2">
                                        {payload.type === "approved" && <Link to="/my-articles" className="bg-[#bd2828] text-white font-bold text-[11px] px-4 py-1.5 rounded shadow-sm hover:bg-red-800">Lihat Artikel</Link>}
                                        {payload.type === "rejected" && (
                                            <>
                                                <Link to="/my-articles" className="bg-[#bd2828] text-white font-bold text-[11px] px-4 py-1.5 rounded shadow-sm hover:bg-red-800">Lihat Alasan</Link>
                                                <Link to="/my-articles" className="bg-white border border-gray-300 text-gray-700 font-bold text-[11px] px-4 py-1.5 rounded hover:bg-gray-50">Edit Draft</Link>
                                            </>
                                        )}
                                        {payload.type === "comment" && <Link to="/my-articles" className="bg-white border border-gray-300 text-blue-700 border-blue-200 font-bold text-[11px] px-4 py-1.5 rounded hover:bg-blue-50">Baca Sekarang</Link>}
                                    </div>
                                </div>

                                <button onClick={() => handleToggleReadSingle(n.id, isRead)} className="absolute top-5 right-5 w-2 h-2 rounded-full cursor-pointer transition shadow-sm" style={{ backgroundColor: isRead ? "#d1d5db" : "#ef4444" }}></button>
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