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
    // DARK MODE (card #082F49)
    // Dark mode series: #7DD3FC, #FFFFFF, #0EA5E9 at 80%, #E0F2FE at 60%
    return {
      isDark: true,
      themeKey: 'dark',
      cardBg: '#082F49',
      cardBorder: 'rgba(125, 211, 252, 0.3)',

      series1: {
        fill: '#7DD3FC',
        stroke: '#7DD3FC',
        strokeWidth: 0
      },
      series2: {
        fill: '#FFFFFF',
        stroke: '#FFFFFF',
        strokeWidth: 0
      },
      series3: {
        fill: 'rgba(14, 165, 233, 0.8)',
        stroke: 'rgba(14, 165, 233, 0.8)',
        strokeWidth: 0
      },
      series4: {
        fill: 'rgba(224, 242, 254, 0.6)',
        stroke: 'rgba(224, 242, 254, 0.6)',
        strokeWidth: 0
      },

      line1: {
        stroke: '#7DD3FC',
        strokeWidth: 2.5,
        dot: { r: 4, fill: '#7DD3FC', stroke: '#082F49', strokeWidth: 1 }
      },
      line2: {
        stroke: '#FFFFFF',
        strokeWidth: 2.5,
        strokeDasharray: '4 4',
        dot: { r: 4, fill: '#FFFFFF', stroke: '#082F49', strokeWidth: 1 }
      },

      gridStroke: 'rgba(125, 211, 252, 0.15)',
      gridDash: '3 3',
      axisStroke: 'rgba(125, 211, 252, 0.3)',
      tickFill: '#FFFFFF',
      tickFontSize: 12,

      tooltipStyle: {
        backgroundColor: '#082F49',
        border: '1px solid rgba(125, 211, 252, 0.3)',
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

      sliceSeparator: '#082F49',
      sliceStrokeWidth: 2
    };
  }

  // LIGHT MODE (card #FFFFFF)
  // Light mode series: #0EA5E9, #075985, #7DD3FC, #0284C7
  return {
    isDark: false,
    themeKey: 'light',
    cardBg: '#FFFFFF',
    cardBorder: '#E0F2FE',

    series1: {
      fill: '#0EA5E9',
      stroke: '#0EA5E9',
      strokeWidth: 0
    },
    series2: {
      fill: '#075985',
      stroke: '#075985',
      strokeWidth: 0
    },
    series3: {
      fill: '#7DD3FC',
      stroke: '#7DD3FC',
      strokeWidth: 0
    },
    series4: {
      fill: '#0284C7',
      stroke: '#0284C7',
      strokeWidth: 0
    },

    line1: {
      stroke: '#0EA5E9',
      strokeWidth: 2.5,
      dot: { r: 4, fill: '#0EA5E9', stroke: '#FFFFFF', strokeWidth: 1 }
    },
    line2: {
      stroke: '#075985',
      strokeWidth: 2.5,
      strokeDasharray: '4 4',
      dot: { r: 4, fill: '#075985', stroke: '#FFFFFF', strokeWidth: 1 }
    },

    gridStroke: 'rgba(7, 89, 133, 0.15)',
    gridDash: '3 3',
    axisStroke: '#E0F2FE',
    tickFill: '#075985',
    tickFontSize: 12,

    tooltipStyle: {
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0F2FE',
      borderRadius: '4px',
      color: '#075985',
      fontSize: '12px',
      boxShadow: 'none'
    },
    tooltipItemStyle: {
      color: '#075985',
      fontSize: '12px'
    },
    tooltipLabelStyle: {
      color: '#075985',
      fontWeight: 600,
      fontSize: '12px',
      marginBottom: '4px'
    },

    legendWrapperStyle: {
      fontSize: '12px',
      color: '#075985',
      paddingTop: '8px'
    },
    legendTextColor: '#075985',

    sliceSeparator: '#FFFFFF',
    sliceStrokeWidth: 2
  };
}
