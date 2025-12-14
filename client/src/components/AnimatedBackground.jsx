import { motion } from 'framer-motion';

const AnimatedBackground = () => {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-black">

            {/* Golden Glow Spots */}
            <motion.div
                className="absolute top-[-30%] left-[-10%] w-[80vw] h-[80vw] rounded-full blur-[150px] opacity-10"
                style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.15, 0.1]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Grid Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-20">
                <pattern id="grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                    <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#FFD700" strokeWidth="0.5" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Moving Lines - Horizontal */}
            {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                    key={`h-${i}`}
                    className="absolute bg-gradient-to-r from-transparent via-[#FFD700] to-transparent h-[1px] w-full opacity-40"
                    style={{ top: `${(i + 1) * 12}%` }}
                    animate={{
                        x: ['-100%', '100%'],
                    }}
                    transition={{
                        duration: 10 + Math.random() * 5,
                        repeat: Infinity,
                        ease: "linear",
                        delay: i * 0.5
                    }}
                />
            ))}

            {/* Moving Lines - Vertical */}
            {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                    key={`v-${i}`}
                    className="absolute bg-gradient-to-b from-transparent via-[#FFD700] to-transparent w-[1px] h-full opacity-20"
                    style={{ left: `${(i + 1) * 15}%` }}
                    animate={{
                        y: ['-100%', '100%'],
                    }}
                    transition={{
                        duration: 15 + Math.random() * 5,
                        repeat: Infinity,
                        ease: "linear",
                        delay: i
                    }}
                />
            ))}
        </div>
    );
};

export default AnimatedBackground;
