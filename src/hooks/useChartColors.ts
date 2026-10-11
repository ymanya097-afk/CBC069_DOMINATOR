import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';

export interface ChartSeriesColor {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface ChartThemeColors {
  isDark: boolean;
  themeKey: string;
  cardBg: string;
  cardBorder: string;

  // Series
  series1: ChartSeriesColor;
  series2: ChartSeriesColor;
  series3: ChartSeriesColor;
  series4: ChartSeriesColor;

  // Lines
  line1: {
    stroke: string;
    strokeWidth: number;
    strokeDasharray?: string;
    dot: { r: number; fill: string; stroke: string; strokeWidth: number };
  };
  line2: {
    stroke: string;
    strokeWidth: number;
    strokeDasharray: string;
    dot: { r: number; fill: string; stroke: string; strokeWidth: number };
  };

  // Grid & Axes
  gridStroke: string;
  gridDash: string;
  axisStroke: string;
  tickFill: string;
  tickFontSize: number;

  // Tooltip
  tooltipStyle: React.CSSProperties;
  tooltipItemStyle: React.CSSProperties;
  tooltipLabelStyle: React.CSSProperties;

  // Legend
  legendWrapperStyle: React.CSSProperties;
  legendTextColor: string;

  // Pie/Donut slice separator
  sliceSeparator: string;
  sliceStrokeWidth: number;
}

export function useChartColors(): ChartThemeColors {
  const { darkMode } = useAuth();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return !!darkMode;
  });

  useEffect(() => {
    const update = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [darkMode]);

  if (isDark) {
    // DARK MODE (card #1C2638)
    // Dark mode series: #4F94E8, #FFFFFF, #7DB6F0, #FFFFFF at 55%
    return {
      isDark: true,
      themeKey: 'dark',
      cardBg: '#1C2638',
      cardBorder: 'rgba(255, 255, 255, 0.1)',

      series1: {
        fill: '#4F94E8',
        stroke: '#4F94E8',
        strokeWidth: 0
      },
      series2: {
        fill: '#FFFFFF',
        stroke: '#FFFFFF',
        strokeWidth: 0
      },
      series3: {
        fill: '#7DB6F0',
        stroke: '#7DB6F0',
        strokeWidth: 0
      },
      series4: {
        fill: 'rgba(255, 255, 255, 0.55)',
        stroke: 'rgba(255, 255, 255, 0.55)',
        strokeWidth: 0
      },

      line1: {
        stroke: '#4F94E8',
        strokeWidth: 2.5,
        dot: { r: 4, fill: '#4F94E8', stroke: '#1C2638', strokeWidth: 1 }
      },
      line2: {
        stroke: '#FFFFFF',
        strokeWidth: 2.5,
        strokeDasharray: '4 4',
        dot: { r: 4, fill: '#FFFFFF', stroke: '#1C2638', strokeWidth: 1 }
      },

      gridStroke: 'rgba(255, 255, 255, 0.15)',
      gridDash: '3 3',
      axisStroke: 'rgba(255, 255, 255, 0.1)',
      tickFill: '#FFFFFF',
      tickFontSize: 12,

      tooltipStyle: {
        backgroundColor: '#1C2638',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        color: '#FFFFFF',
        fontSize: '12px',
        boxShadow: 'none'
      },
      tooltipItemStyle: {
        color: '#FFFFFF',
        fontSize: '12px'
      },
      tooltipLabelStyle: {
        color: '#FFFFFF',
        fontWeight: 600,
        fontSize: '12px',
        marginBottom: '4px'
      },

      legendWrapperStyle: {
        fontSize: '12px',
        color: '#FFFFFF',
        paddingTop: '8px'
      },
      legendTextColor: '#FFFFFF',

      sliceSeparator: '#1C2638',
      sliceStrokeWidth: 2
    };
  }

  // LIGHT MODE (card #FFFFFF)
  // Light mode series: #4F94E8, #1E2430, #7DB6F0, #6B7280
  return {
    isDark: false,
    themeKey: 'light',
    cardBg: '#FFFFFF',
    cardBorder: '#E5E7EB',

    series1: {
      fill: '#4F94E8',
      stroke: '#4F94E8',
      strokeWidth: 0
    },
    series2: {
      fill: '#1E2430',
      stroke: '#1E2430',
      strokeWidth: 0
    },
    series3: {
      fill: '#7DB6F0',
      stroke: '#7DB6F0',
      strokeWidth: 0
    },
    series4: {
      fill: '#6B7280',
      stroke: '#6B7280',
      strokeWidth: 0
    },

    line1: {
      stroke: '#4F94E8',
      strokeWidth: 2.5,
      dot: { r: 4, fill: '#4F94E8', stroke: '#FFFFFF', strokeWidth: 1 }
    },
    line2: {
      stroke: '#1E2430',
      strokeWidth: 2.5,
      strokeDasharray: '4 4',
      dot: { r: 4, fill: '#1E2430', stroke: '#FFFFFF', strokeWidth: 1 }
    },

    gridStroke: 'rgba(30, 36, 48, 0.15)',
    gridDash: '3 3',
    axisStroke: '#E5E7EB',
    tickFill: '#1E2430',
    tickFontSize: 12,

    tooltipStyle: {
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '4px',
      color: '#1E2430',
      fontSize: '12px',
      boxShadow: 'none'
    },
    tooltipItemStyle: {
      color: '#1E2430',
      fontSize: '12px'
    },
    tooltipLabelStyle: {
      color: '#1E2430',
      fontWeight: 600,
      fontSize: '12px',
      marginBottom: '4px'
    },

    legendWrapperStyle: {
      fontSize: '12px',
      color: '#1E2430',
      paddingTop: '8px'
    },
    legendTextColor: '#1E2430',

    sliceSeparator: '#FFFFFF',
    sliceStrokeWidth: 2
  };
}
