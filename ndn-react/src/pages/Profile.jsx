import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Profile() {
    const [activeTab, setActiveTab] = useState("Artikel Saya");
    const [userProfile, setUserProfile] = useState(null);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    const [editName, setEditName] = useState("");
    const [editBio, setEditBio] = useState("");
    const [updateMessage, setUpdateMessage] = useState({ type: "", text: "" });
    const [isUpdating, setIsUpdating] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfileAndArticles = async () => {
            try {
                const { data: { session }, error: authError } = await supabase.auth.getSession();

                if (authError || !session) {
                    navigate("/login");
                    return;
                }

                const userEmail = session.user.email;

                // Ambil profil user
                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("*")
                    .eq("email", userEmail)
                    .single();

                if (userError || !userData) {
                    console.error("Gagal memuat profil database:", userError?.message);
                    return;
                }

                setUserProfile(userData);
                setEditName(userData.name || "");
                setEditBio(userData.bio || "");

                // Tarik artikel milik user ini
                const { data: articlesData, error: articlesError } = await supabase
                    .from("articles")
                    .select("*, categories(name)")
                    .eq("user_id", userData.id)
                    .order("created_at", { ascending: false });

                if (articlesError) throw articlesError;
                if (articlesData) setArticles(articlesData);

            } catch (error) {
                console.error("Error eksekusi profil:", error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileAndArticles();
    }, [navigate]);

    // FUNGSI PENYELAMAT TANGGAL (Anti 1 Jan 1970)
    const formatDate = (isoString) => {
        if (!isoString) return "Baru Saja";
        const date = new Date(isoString);
        // Jika format tanggal tidak valid, berikan fallback tulisan "Baru Saja"
        return isNaN(date.getTime())
            ? "Baru Saja"
            : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getInitials = (name) => {
        if (!name) return "NDN";
        const words = name.trim().split(" ");
        if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return "https://images.unsplash.com/photo-1541876751093-68d6d67b7891?q=80&w=1200";
        if (imagePath.startsWith("http")) return imagePath;
        const cleanPath = imagePath.startsWith("articles/") ? imagePath : `articles/${imagePath}`;
        return `https://qwhetscllvvbyufzeeyy.supabase.co/storage/v1/object/public/Article-Image/${cleanPath}`;
    };

    const formatStatus = (dbStatus) => {
        if (dbStatus === "published" || dbStatus === "approved") return "Terbit";
        if (dbStatus === "pending") return "Menunggu Review";
        if (dbStatus === "rejected") return "Ditolak";
        return "Menunggu Review";
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!editName.trim()) {
            setUpdateMessage({ type: "error", text: "Nama tidak boleh kosong!" });
            return;
        }

        setIsUpdating(true);
        setUpdateMessage({ type: "", text: "" });

        try {
            const { error } = await supabase
                .from("users")
                .update({ name: editName, bio: editBio })
                .eq("id", userProfile.id);

            if (error) throw error;
            setUserProfile({ ...userProfile, name: editName, bio: editBio });
            setUpdateMessage({ type: "success", text: "Profil Anda berhasil diperbarui! 🎉" });
        } catch (error) {
            setUpdateMessage({ type: "error", text: "Gagal memperbarui: " + error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const totalPublished = articles.filter(a => a.status === "published" || a.status === "approved").length;
    const totalViews = articles.reduce((sum, item) => sum + (item.view_count || 0), 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-t-[#bd2828] border-gray-200 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-gray-500">Menghubungkan ke profil database...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] pb-20 pt-8 font-sans">
            <div className="max-w-5xl mx-auto px-6">

                {/* HERO CARD SECTION */}
                <div className="bg-gradient-to-r from-[#a31d1d] to-[#d33a3a] rounded-2xl p-8 md:p-10 shadow-lg mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full transform translate-x-20 -translate-y-10"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                        <div className="w-32 h-32 bg-white rounded-2xl shadow-xl flex items-center justify-center shrink-0 border border-white/20">
                            <span className="text-5xl font-serif font-bold text-[#a31d1d]">{getInitials(userProfile?.name)}</span>
                        </div>

                        <div className="flex-1 text-center md:text-left text-white">
                            <div className="flex flex-col md:flex-row items-center gap-4 mb-3">
                                <h1 className="text-3xl font-serif font-bold tracking-wide">{userProfile?.name || "Penulis NDN"}</h1>
                                <span className="bg-[#f0c05a] text-[#855a15] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                    👑 {userProfile?.role || "Author"}
                                </span>
                            </div>
                            <p className="text-red-100 text-sm mb-6 max-w-2xl leading-relaxed italic">
                                {userProfile?.bio || "Penulis ini belum menuliskan deskripsi bio di akunnya."}
                            </p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg py-2 px-5 text-center min-w-[110px]">
                                    <p className="text-2xl font-bold">{articles.length}</p>
                                    <p className="text-[9px] uppercase tracking-widest text-red-200 mt-0.5">Total Kirim</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg py-2 px-5 text-center min-w-[110px]">
                                    <p className="text-2xl font-bold">{totalPublished}</p>
                                    <p className="text-[9px] uppercase tracking-widest text-red-200 mt-0.5">Berita Terbit</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg py-2 px-5 text-center min-w-[110px]">
                                    <p className="text-2xl font-bold">{totalViews}</p>
                                    <p className="text-[9px] uppercase tracking-widest text-red-200 mt-0.5">Total Views</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABS NAVIGASI */}
                <div className="flex border-b border-gray-200 mb-8">
                    <button onClick={() => setActiveTab("Artikel Saya")} className={`pb-4 px-6 text-sm font-bold transition cursor-pointer ${activeTab === "Artikel Saya" ? "text-[#a31d1d] border-b-2 border-[#a31d1d]" : "text-gray-500 hover:text-gray-800"}`}>Artikel Saya</button>
                    <button onClick={() => setActiveTab("Pengaturan Akun")} className={`pb-4 px-6 text-sm font-bold transition cursor-pointer ${activeTab === "Pengaturan Akun" ? "text-[#a31d1d] border-b-2 border-[#a31d1d]" : "text-gray-500 hover:text-gray-800"}`}>Pengaturan Akun</button>
                </div>

                {/* LIST CARD ARTIKEL */}
                {activeTab === "Artikel Saya" && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-serif font-bold text-gray-900 mb-4">Daftar Artikel</h2>
                        {articles.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">Belum ada artikel.</div>
                        ) : (
                            articles.map((article) => {
                                const uiStatus = formatStatus(article.status);
                                return (
                                    <div key={article.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-6 items-center shadow-sm">
                                        <div className="w-full sm:w-48 h-32 shrink-0 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                            <img src={getImageUrl(article.image)} alt={article.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="bg-red-50 text-[#a31d1d] text-[10px] font-extrabold px-2.5 py-1 rounded tracking-widest uppercase">{article.categories?.name || "BERITA"}</span>
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${uiStatus === "Terbit" ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${uiStatus === "Terbit" ? "bg-green-500" : "bg-yellow-500"}`}></span>{uiStatus}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-serif font-bold text-gray-900 leading-snug mb-3 line-clamp-2">{article.title}</h3>
                                            <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                                {/* PENGGUNAAN FUNGSI BARU DISINI */}
                                                <span>📅 {formatDate(article.created_at)}</span>
                                                <span>👁️ {article.view_count || 0} Pembaca</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* SETTING AKUN TAB */}
                {activeTab === "Pengaturan Akun" && (
                    <form onSubmit={handleUpdateProfile} className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm space-y-6 max-w-2xl">
                        {updateMessage.text && <div className={`p-4 rounded border text-xs font-semibold ${updateMessage.type === "success" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>{updateMessage.text}</div>}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Lengkap Pena *</label>
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-2.5 px-4 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#bd2828]" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Biografi Singkat</label>
                            <textarea rows="4" value={editBio} onChange={(e) => setEditBio(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-2.5 px-4 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#bd2828] resize-none"></textarea>
                        </div>
                        <button type="submit" disabled={isUpdating} className="bg-[#a31d1d] text-white px-6 py-2.5 rounded font-bold text-xs uppercase tracking-wider hover:bg-red-800 cursor-pointer">{isUpdating ? "Saving..." : "Simpan Perubahan"}</button>
                    </form>
                )}

            </div>
        </div>
    );
}