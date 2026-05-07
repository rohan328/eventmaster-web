import styles from "./SkeletonCard.module.css";

export default function SkeletonCard() {
  return (
    <article className={styles.skeletonCard}>
      <div className={styles.skeletonPoster} />
      <div className={styles.skeletonLineLarge} />
      <div className={styles.skeletonLineSmall} />
    </article>
  );
}
