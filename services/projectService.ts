
import { Task, ProjectStats } from '../types';

export const calculateStats = (tasks: Task[]): ProjectStats => {
  const total = tasks.length;
  if (total === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      delayedTasks: 0,
      plannedPhysical: 0,
      actualPhysical: 0,
      overallSpi: 0,
      globalStatus: 'On Track'
    };
  }

  const completed = tasks.filter(t => t.actualProgress === 100).length;
  const inProgress = tasks.filter(t => t.actualProgress > 0 && t.actualProgress < 100).length;
  const delayed = tasks.filter(t => {
    const now = new Date();
    const end = new Date(t.currentEnd);
    return now > end && t.actualProgress < 100;
  }).length;

  const totalDuration = tasks.reduce((acc, t) => acc + (t.duration || 1), 0);

  const actualPhysical = tasks.reduce((acc, t) => {
    const weight = (t.duration || 1) / totalDuration;
    return acc + (t.actualProgress * weight);
  }, 0);

  const plannedPhysical = tasks.reduce((acc, t) => {
    const weight = (t.duration || 1) / totalDuration;
    return acc + (t.plannedProgress * weight);
  }, 0);

  const avgSpi = actualPhysical / (plannedPhysical || 1);

  let status: 'On Track' | 'At Risk' | 'Critical' = 'On Track';
  if (avgSpi < 0.9) status = 'Critical';
  else if (avgSpi < 0.98) status = 'At Risk';

  return {
    totalTasks: total,
    completedTasks: completed,
    inProgressTasks: inProgress,
    delayedTasks: delayed,
    plannedPhysical: Number(plannedPhysical.toFixed(1)),
    actualPhysical: Number(actualPhysical.toFixed(1)),
    overallSpi: Number(avgSpi.toFixed(2)),
    globalStatus: status
  };
};

export const generateSCurveData = (tasks: Task[]) => {
  if (tasks.length === 0) return [];

  // Filter out groups for curve calculation to avoid double counting if WBS is not perfectly flat
  // However, usually we use all tasks if they have durations. 
  // Let's use tasks with duration > 0.
  const activeTasks = tasks.filter(t => (t.duration || 0) > 0);
  if (activeTasks.length === 0) return [];

  const starts = activeTasks.map(t => new Date(t.currentStart).getTime());
  const ends = activeTasks.map(t => new Date(t.currentEnd).getTime());
  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);
  const totalDurationTime = maxEnd - minStart;

  if (totalDurationTime <= 0) return [];

  const points = 20; // Increased points for smoother curve
  const step = totalDurationTime / (points - 1);
  const totalWeight = activeTasks.reduce((acc, t) => acc + (t.duration || 1), 0);

  const now = Date.now();

  return Array.from({ length: points }).map((_, idx) => {
    const currentTime = minStart + (step * idx);
    const dateLabel = new Date(currentTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    let plannedAcc = 0;
    let actualAcc = 0;

    activeTasks.forEach(t => {
      const weight = (t.duration || 1) / totalWeight;
      const tStart = new Date(t.currentStart).getTime();
      const tEnd = new Date(t.currentEnd).getTime();
      const tDuration = tEnd - tStart;

      // Planned Curve (Cumulative)
      if (currentTime >= tEnd) {
        plannedAcc += 100 * weight;
      } else if (currentTime > tStart && tDuration > 0) {
        const elapsed = currentTime - tStart;
        plannedAcc += (elapsed / tDuration) * 100 * weight;
      }

      // Real Curve (Cumulative)
      // Only calculate real if the point is in the past
      if (currentTime <= now) {
        // Here we estimate the real progress at this point in time.
        // For a more accurate "Real" curve, we would need historical progress logs.
        // Since we don't have them, we interpolate between actualProgress and start/now.
        if (currentTime >= now) {
          actualAcc += (t.actualProgress * weight);
        } else if (currentTime > tStart) {
          // Linear interpolation of performance: progress / (now - start)
          const performance = t.actualProgress / (Math.max(1, now - tStart));
          const elapsedAtPoint = currentTime - tStart;
          actualAcc += Math.min(t.actualProgress, Math.round(performance * elapsedAtPoint)) * weight;
        }
      }
    });

    return {
      name: dateLabel,
      planned: Number(plannedAcc.toFixed(1)),
      real: currentTime <= now ? Number(actualAcc.toFixed(1)) : null
    };
  });
};
