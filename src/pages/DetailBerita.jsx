import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function DetailBerita() {
    const { id } = useParams();
    const [article, setArticle] = useState(null);
    const [popularArticles, setPopularArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    const [likesCount, setLikesCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [commentLoading, setCommentLoading] = useState(false);
    const [currentRealUser, setCurrentRealUser] = useState(null);

    const fetchDetailAndInteractions = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let myRealId = null;
            if (session) {
                const { data: uData } = await supabase.from("users").select("id, name").eq("email", session.user.email).single();
                if (uData) {
                    setCurrentRealUser(uData);
                    myRealId = uData.id;
                }
            }

            const { data: artData, error: artError } = await supabase
                .from("articles")
                .select("*, categories(name), users(name)")
                .eq("id", id)
                .single();

            if (artError) throw artError;
            setArticle(artData);

            const { count: totalLikes } = await supabase
                .from("article_likes")
                .select("*", { count: "exact", head: true })
                .eq("article_id", id);
            setLikesCount(totalLikes || 0);

            if (myRealId) {
                const { data: likeCheck } = await supabase
                    .from("article_likes")
                    .select("id")
                    .eq("article_id", id)
                    .eq("user_id", myRealId);
                setHasLiked(likeCheck && likeCheck.length > 0);
            }

            const { data: popData } = await supabase
                .from("articles")
                .select("*, categories(name)")
                .in("status", ["published", "approved"])
                .order("created_at", { ascending: false })
                .limit(3);
            if (popData) setPopularArticles(popData);

            const { data: commentData } = await supabase
                .from("comments")
                .select("*, users(name)")
                .eq("article_id", id)
                .order("created_at", { ascending: true });
            if (commentData) setComments(commentData);

        } catch (error) {
            console.error("Error Detail:", error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetailAndInteractions();
    }, [id]);

    const handleLikeToggle = async () => {
        if (!currentRealUser) {
            alert("Anda harus login terlebih dahulu untuk menyukai artikel!");
            return;
        }

        try {
            if (hasLiked) {
                const { error } = await supabase
                    .from("article_likes")
                    .eq("article_id", id)
                    .eq("user_id", currentRealUser.id)
                    .delete();
                if (error) throw error;
                setLikesCount(prev => prev - 1);
            } else {
                const { error } = await supabase
                    .from("article_likes")
                    .insert([{ article_id: id, user_id: currentRealUser.id }]);
                if (error) throw error;
                setLikesCount(prev => prev + 1);
            }
            setHasLiked(!hasLiked);
        } catch (error) {
            console.error("Gagal memproses like:", error.message);
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setCommentLoading(true);
        try {
            const myId = currentRealUser ? currentRealUser.id : null;
            const myName = currentRealUser ? currentRealUser.name : "Pembaca Anonim";

            const { error: comError } = await supabase
                .from("comments")
                .insert([{ body: newComment.trim(), article_id: id, user_id: myId }]);
            if (comError) throw comError;

            // SUNTIK NOTIFIKASI BERDASARKAN FORMAT LARAVEL TABLE
            if (article.user_id && article.user_id !== myId) {
                const { error: notifErr } = await supabase.from("notifications").insert([
                    {
                        id: crypto.randomUUID(),
                        type: "App\\Notifications\\NewComment",
                        notifiable_type: "App\\Models\\User",
                        notifiable_id: article.user_id,
                        data: JSON.stringify({
                            title: "Komentar Baru Diterima",
                            body: `${myName} memberikan komentar pada artikel Anda: "${article.title}"`,
                            type: "comment"
                        }),
                        read_at: null
                    }
                ]);
                if (notifErr) console.error("Gagal kirim notif komentar:", notifErr.message);
            }

            setNewComment("");
            const { data: freshComments } = await supabase.from("comments").select("*, users(name)").eq("article_id", id).order("created_at", { ascending: true });
            if (freshComments) setComments(freshComments);

        } catch (error) {
            alert("Error komentar: " + error.message);
        } finally {
            setCommentLoading(false);
        }
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return "https://images.unsplash.com/photo-1541876751093-68d6d67b7891?q=80&w=1200";
        if (imagePath.startsWith("http")) return imagePath;
        const cleanPath = imagePath.startsWith("articles/") ? imagePath : `articles/${imagePath}`;
        return `https://qwhetscllvvbyufzeeyy.supabase.co/storage/v1/object/public/Article-Image/${cleanPath}`;
    };

    const formatDate = (isoString) => {
        if (!isoString) return "Baru Saja";
        return new Date(isoString).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };

    if (loading) return <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-t-[#bd2828] border-gray-200 rounded-full animate-spin"></div></div>;
    if (!article) return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center text-gray-500">Artikel tidak ditemukan.</div>;

    return (
        <div className="min-h-screen bg-[#fafafa] pb-20 font-sans">
            <div className="relative w-full h-[45vh] bg-black overflow-hidden">
                <img src={getImageUrl(article.image)} alt={article.title} className="w-full h-full object-cover opacity-75" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] via-black/30 to-transparent"></div>
                <div className="absolute bottom-6 left-0 w-full px-6 max-w-7xl mx-auto z-10">
                    <span className="bg-[#bd2828] text-white text-xs font-extrabold px-3 py-1 rounded tracking-wider uppercase mb-3 inline-block">{article.categories?.name || "UMUM"}</span>
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-950 md:text-white drop-shadow leading-tight max-w-4xl">{article.title}</h1>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#bd2828] text-white flex items-center justify-center font-bold text-sm">{getInitials(article.users?.name)}</div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{article.users?.name || "Kontributor NDN"}</p>
                                <p className="text-xs text-gray-400">Jurnalis Warga</p>
                            </div>
                        </div>
                        <div className="text-right text-xs text-gray-500 font-medium">
                            <p>📅 {formatDate(article.created_at)}</p>
                            <p className="mt-0.5">⏱️ 5 Menit Baca</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm">
                        <div className="text-gray-800 text-base leading-relaxed whitespace-pre-line font-serif">{article.content}</div>
                    </div>

                    <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">Bagaimana menurut Anda berita ini?</h4>
                            <p className="text-xs text-gray-400">Tekan tombol suka untuk mengapresiasi jurnalis kontributor kami.</p>
                        </div>
                        <button onClick={handleLikeToggle} className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition shadow-sm border cursor-pointer ${hasLiked ? "bg-red-50 text-[#bd2828] border-[#bd2828]" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}>
                            <span className="text-lg">{hasLiked ? "❤️" : "🤍"}</span>
                            <span>{likesCount} Likes</span>
                        </button>
                    </div>

                    <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm space-y-6">
                        <h3 className="font-serif font-bold text-lg text-gray-900 border-b pb-3">💬 Kolom Komentar ({comments.length})</h3>
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                            {comments.map((comment) => (
                                <div key={comment.id} className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-gray-800">{comment.users?.name || "Pembaca Anonim"}</span>
                                        <span className="text-[10px] text-gray-400">{formatDate(comment.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">{comment.body}</p>
                                </div>
                            ))}
                            {comments.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">Belum ada tanggapan. Kirim opini pertama Anda!</p>}
                        </div>

                        <form onSubmit={handlePostComment} className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={currentRealUser ? "Tulis opini atau tanggapan Anda..." : "Login dulu untuk berkomentar..."} disabled={!currentRealUser} className="flex-1 bg-white border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828]" required />
                            <button type="submit" disabled={commentLoading || !currentRealUser} className="bg-[#bd2828] text-white px-5 py-2.5 rounded-md font-bold text-xs uppercase hover:bg-red-800 transition disabled:opacity-50 cursor-pointer">Kirim</button>
                        </form>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm sticky top-28">
                        <h3 className="font-serif font-bold text-lg text-gray-900 border-b pb-3 mb-4">📌 Populer Hari Ini</h3>
                        <div className="divide-y divide-gray-100 space-y-4">
                            {popularArticles.map((popArt, idx) => (
                                <div key={popArt.id} className="pt-4 first:pt-0 group">
                                    <div className="flex gap-4 items-start">
                                        <span className="text-3xl font-bold font-serif text-gray-200 group-hover:text-[#bd2828] transition leading-none">0{idx + 1}</span>
                                        <div>
                                            <span className="text-[9px] font-extrabold text-[#bd2828] uppercase block mb-1">{popArt.categories?.name || "NASIONAL"}</span>
                                            <Link to={`/artikel/${popArt.id}`} className="font-serif font-bold text-sm text-gray-900 line-clamp-2 hover:text-[#bd2828] transition leading-snug">{popArt.title}</Link>
                                            <span className="text-[10px] text-gray-400 block mt-1.5">🕒 {formatDate(popArt.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getInitials(name) {
    if (!name) return "KT";
    const words = name.trim().split(" ");
    return words.length === 1 ? words[0].substring(0, 2).toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
}