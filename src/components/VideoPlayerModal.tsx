import { motion } from 'framer-motion';
import ReactPlayer from 'react-player';
import { ExternalLink } from 'lucide-react';

export default function VideoPlayerModal({ video, item, onClose }: { video: string; item: any; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="bg-slate-900 rounded-3xl overflow-hidden w-full max-w-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h4 className="text-white font-black">{item?.title}</h4>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20">✕</button>
        </div>
        <div className="aspect-video bg-black flex items-center justify-center relative">
          <div className="w-full h-full relative group">
            {video.includes('youtube') || video.includes('youtu.be') ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${(() => {
                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                  const match = video.match(regExp);
                  return (match && match[2].length >= 11) ? match[2].substring(0, 11) : video.split('embed/')[1]?.split('?')[0] || '';
                })()}?autoplay=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            ) : (
              <div className="w-full h-full">
                {(() => {
                  const Player = ReactPlayer as any;
                  return (
                    <Player
                      key={video}
                      url={video}
                      width="100%"
                      height="100%"
                      controls
                      playing
                      onError={(e: any) => {
                        console.error("ReactPlayer Error:", e);
                      }}
                    />
                  );
                })()}
              </div>
            )}
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] text-white flex items-center gap-2 pointer-events-none">
              <ExternalLink size={12} />
              <span className="hover:underline">المشغل المباشر</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
