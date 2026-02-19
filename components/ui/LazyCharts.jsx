'use client';
import dynamic from 'next/dynamic';

/**
 * Lazy-loaded Recharts components.
 * Reduces initial bundle size by ~300KB since charts are not needed on first render.
 */

// Bar Chart wrapper
export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => {
    // Return a wrapper component that passes through all props
    const Wrapper = (props) => {
      const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } = mod;
      return props.children ? (
        <ResponsiveContainer width={props.width || "100%"} height={props.height || 160}>
          <BarChart data={props.data} margin={props.margin} layout={props.layout}>
            {props.children({ BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell })}
          </BarChart>
        </ResponsiveContainer>
      ) : null;
    };
    Wrapper.displayName = 'LazyBarChart';
    return Wrapper;
  }),
  { ssr: false, loading: () => <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8A29E', fontSize: 12 }}>차트 로딩 중...</div> }
);

// Area Chart wrapper
export const LazyAreaChart = dynamic(
  () => import('recharts').then(mod => {
    const Wrapper = (props) => {
      const { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } = mod;
      return props.children ? (
        <ResponsiveContainer width={props.width || "100%"} height={props.height || 200}>
          <AreaChart data={props.data} margin={props.margin}>
            {props.children({ AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine })}
          </AreaChart>
        </ResponsiveContainer>
      ) : null;
    };
    Wrapper.displayName = 'LazyAreaChart';
    return Wrapper;
  }),
  { ssr: false, loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8A29E', fontSize: 12 }}>차트 로딩 중...</div> }
);

/**
 * Direct re-export of recharts components for places that need them synchronously.
 * Use this only when dynamic import doesn't work well (e.g., complex nested charts).
 * Still lazy-loaded at the module level.
 */
export const RechartsModule = dynamic(
  () => import('recharts').then(mod => {
    const Provider = ({ children }) => children(mod);
    Provider.displayName = 'RechartsModule';
    return Provider;
  }),
  { ssr: false, loading: () => <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8A29E', fontSize: 12 }}>차트 로딩 중...</div> }
);
