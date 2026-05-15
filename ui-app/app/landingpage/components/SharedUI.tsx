'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';

export function ProgressDot({ index, total, scrollYProgress }: { index: number; total: number; scrollYProgress: MotionValue<number> }) {
    const opacity = useTransform(
        scrollYProgress,
        [index / total, (index + 0.5) / total, (index + 1) / total],
        [0.3, 1, 0.3]
    );

    return (
        <motion.div
            style={{ opacity }}
            className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm"
        />
    );
}