import type { Variants } from 'framer-motion';

export const staggerContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
};

export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
        },
    },
};
