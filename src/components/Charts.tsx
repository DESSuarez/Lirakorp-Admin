'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BarChartProps {
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
  title?: string;
}

export function BarChart({ data, options, title }: BarChartProps) {
  const defaultOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
        font: { size: 16 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-80 w-full">
      <Bar data={data} options={{ ...defaultOptions, ...options }} />
    </div>
  );
}

interface DoughnutChartProps {
  data: ChartData<'doughnut'>;
  options?: ChartOptions<'doughnut'>;
  title?: string;
}

export function DoughnutChart({ data, options, title }: DoughnutChartProps) {
  const defaultOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: !!title,
        text: title,
        font: { size: 16 },
      },
    },
  };

  return (
    <div className="h-80 w-full">
      <Doughnut data={data} options={{ ...defaultOptions, ...options }} />
    </div>
  );
}

interface LineChartProps {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
  title?: string;
}

export function LineChart({ data, options, title }: LineChartProps) {
  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
        font: { size: 16 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-80 w-full">
      <Line data={data} options={{ ...defaultOptions, ...options }} />
    </div>
  );
}

interface ReportChartsProps {
  occupancyData: ChartData<'bar'>;
  rentData: ChartData<'bar'>;
  collectionData: ChartData<'doughnut'>;
}

export default function ReportCharts({
  occupancyData,
  rentData,
  collectionData,
}: ReportChartsProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <BarChart data={occupancyData} title="Tasa de Ocupación por Zona (%)" />
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <BarChart
          data={rentData}
          title="Renta Mensual Total por Zona"
          options={{
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = context.parsed.y ?? 0;
                    return `${context.dataset.label}: $${value.toLocaleString('es-MX')}`;
                  },
                },
              },
            },
          }}
        />
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <DoughnutChart data={collectionData} title="Resumen de Cobranza Mensual" />
      </div>
    </div>
  );
}
