import { AnimatePresence, motion } from "framer-motion";

export default function RouteTransition({ routeKey, children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 8, scale: 0.95, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.975, filter: "blur(6px)" }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="page-wrap"
      >
        <motion.div
          className="route-box route-box-a"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 0.15, x: 0, y: [0, -10, 0] }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        />
        <motion.div
          className="route-box route-box-b"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 0.12, x: 0, y: [0, 8, 0] }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
