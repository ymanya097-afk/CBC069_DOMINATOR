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
    // DARK MODE (card #232b3d)
    // series 1: #3a6993 solid with a 1px #fffeff outline
    // series 2: #fffeff solid
    // series 3: #3a6993 at 70% with a #fffeff outline
    // series 4: #fffeff at 55%
    // Never draw anything in solid #232b3d on the dark background.
    return {
      isDark: true,
      themeKey: 'dark',
      cardBg: '#232b3d',
      cardBorder: 'rgba(255, 254, 255, 0.25)',

      series1: {
        fill: '#3a6993',
        stroke: '#fffeff',
        strokeWidth: 1
      },
      series2: {
        fill: '#fffeff',
        stroke: '#fffeff',
        strokeWidth: 1
      },
      series3: {
        fill: 'rgba(58, 105, 147, 0.70)',
        stroke: '#fffeff',
        strokeWidth: 1
      },
      series4: {
        fill: 'rgba(255, 254, 255, 0.55)',
        stroke: 'rgba(255, 254, 255, 0.55)',
        strokeWidth: 1
      },

      line1: {
        stroke: '#3a6993',
        strokeWidth: 2.5,
        dot: { r: 4, fill: '#3a6993', stroke: '#fffeff', strokeWidth: 1 }
      },
      line2: {
        stroke: '#fffeff',
        strokeWidth: 2.5,
        strokeDasharray: '4 4',
        dot: { r: 4, fill: '#fffeff', stroke: '#232b3d', strokeWidth: 1 }
      },

      gridStroke: 'rgba(255, 254, 255, 0.15)',
      gridDash: '3 3',
      axisStroke: 'rgba(255, 254, 255, 0.75)',
      tickFill: 'rgba(255, 254, 255, 0.75)',
      tickFontSize: 12,

      tooltipStyle: {
        backgroundColor: '#232b3d',
        border: '1px solid rgba(255, 254, 255, 0.25)',
        borderRadius: '4px',
        color: '#fffeff',
        fontSize: '12px',
        boxShadow: 'none'
      },
      tooltipItemStyle: {
        color: '#fffeff',
        fontSize: '12px'
      },
      tooltipLabelStyle: {
        color: '#fffeff',
        fontWeight: 600,
        fontSize: '12px',
        marginBottom: '4px'
      },

      legendWrapperStyle: {
        fontSize: '12px',
        color: '#fffeff',
        paddingTop: '8px'
      },
      legendTextColor: '#fffeff',

      sliceSeparator: '#232b3d',
      sliceStrokeWidth: 2
    };
  }

  // LIGHT MODE (card #fffeff)
  // series 1: #3a6993 solid
  // series 2: #232b3d solid
  // series 3: #3a6993 at 55%
  // series 4: #232b3d at 45%
  return {
    isDark: false,
    themeKey: 'light',
    cardBg: '#fffeff',
    cardBorder: 'rgba(35, 43, 61, 0.25)',

    series1: {
      fill: '#3a6993',
      stroke: '#3a6993',
      strokeWidth: 0
    },
    series2: {
      fill: '#232b3d',
      stroke: '#232b3d',
      strokeWidth: 0
    },
    series3: {
      fill: 'rgba(58, 105, 147, 0.55)',
      stroke: 'rgba(58, 105, 147, 0.55)',
      strokeWidth: 0
    },
    series4: {
      fill: 'rgba(35, 43, 61, 0.45)',
      stroke: 'rgba(35, 43, 61, 0.45)',
      strokeWidth: 0
    },

    line1: {
      stroke: '#3a6993',
      strokeWidth: 2.5,
      dot: { r: 4, fill: '#3a6993', stroke: '#fffeff', strokeWidth: 1 }
    },
    line2: {
      stroke: '#232b3d',
      strokeWidth: 2.5,
      strokeDasharray: '4 4',
      dot: { r: 4, fill: '#232b3d', stroke: '#fffeff', strokeWidth: 1 }
    },

    gridStroke: 'rgba(35, 43, 61, 0.15)',
    gridDash: '3 3',
    axisStroke: 'rgba(35, 43, 61, 0.75)',
    tickFill: 'rgba(35, 43, 61, 0.75)',
    tickFontSize: 12,

    tooltipStyle: {
      backgroundColor: '#fffeff',
      border: '1px solid rgba(35, 43, 61, 0.25)',
      borderRadius: '4px',
      color: '#232b3d',
      fontSize: '12px',
      boxShadow: 'none'
    },
    tooltipItemStyle: {
      color: '#232b3d',
      fontSize: '12px'
    },
    tooltipLabelStyle: {
      color: '#232b3d',
      fontWeight: 600,
      fontSize: '12px',
      marginBottom: '4px'
    },

    legendWrapperStyle: {
      fontSize: '12px',
      color: '#232b3d',
      paddingTop: '8px'
    },
    legendTextColor: '#232b3d',

    sliceSeparator: '#fffeff',
    sliceStrokeWidth: 2
  };
}
