import { useState, useEffect } from 'react';
import { 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  ComposedChart,
  BarChart,
  Bar
} from 'recharts';
import { 
  ArrowTrendingUpIcon, 
  ExclamationTriangleIcon, 
  CalendarIcon,
  FireIcon,
  BoltIcon,
  LightBulbIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { 
  forecastingService, 
  type ForecastResponse, 
  type ChefDashboard, 
  type WeeklyTrend 
} from '../../services/forecasting.service';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ForecastChartData {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  formattedDate: string;
}

export default function AdminForecastingPage() {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [chefDashboard, setChefDashboard] = useState<ChefDashboard | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState(7);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [daysAhead]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [forecastData, dashboardData, trendData] = await Promise.all([
        forecastingService.getDemandForecast(daysAhead),
        forecastingService.getChefDashboard(),
        forecastingService.getWeeklyTrends()
      ]);
      setForecast(forecastData);
      setChefDashboard(dashboardData);
      setWeeklyTrend(trendData);
    } catch (err) {
      setError('Erreur lors du chargement des prévisions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = (): ForecastChartData[] => {
    if (!forecast) return [];
    return forecast.forecasts.map(f => ({
      date: f.date,
      predicted: f.predicted_orders,
      lower: f.confidence_lower,
      upper: f.confidence_upper,
      formattedDate: format(parseISO(f.date), 'EEE d MMM', { locale: fr })
    }));
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <ArrowUpRightIcon className="w-5 h-5 text-green-500" />;
    }
    return <ArrowDownRightIcon className="w-5 h-5 text-red-500" />;
  };

  const getRiskBadge = (risk: string) => {
    const colors = {
      HIGH: 'bg-red-100 text-red-700 border-red-200',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      LOW: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    const labels = {
      HIGH: 'Risque Élevé',
      MEDIUM: 'Risque Moyen',
      LOW: 'Risque Faible'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[risk as keyof typeof colors]}`}>
        {labels[risk as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-amber-600" />
          <p className="text-gray-600">Analyse des données et génération des prévisions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">{error}</span>
          </div>
          <button 
            onClick={loadAllData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const chartData = getChartData();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <LightBulbIcon className="w-8 h-8 text-amber-600" />
              Planification des Commandes
            </h1>
            <p className="text-gray-600 mt-2">
              Analyse prédictive basée sur Prophet (Facebook) - Détection des saisonnalités et tendances
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value={3}>3 jours</option>
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
            </select>
            <button
              onClick={loadAllData}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-700 font-medium">Prévision Aujourd'hui</span>
            <LightBulbIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {chefDashboard?.total_predicted_orders || 0}
          </div>
          <div className="text-sm text-amber-700 mt-1">commandes attendues</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-700 font-medium">Revenu Prévu</span>
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {(chefDashboard?.total_predicted_revenue || 0).toFixed(0)} TND
          </div>
          <div className="text-sm text-green-700 mt-1">chiffre d'affaires</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-700 font-medium">vs Semaine Dernière</span>
            {chefDashboard && getTrendIcon(chefDashboard.vs_last_week_change)}
          </div>
          <div className={`text-3xl font-bold ${
            (chefDashboard?.vs_last_week_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {chefDashboard ? `${chefDashboard.vs_last_week_change > 0 ? '+' : ''}${chefDashboard.vs_last_week_change.toFixed(1)}%` : '0%'}
          </div>
          <div className="text-sm text-blue-700 mt-1">évolution</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-700 font-medium">Confiance Modèle</span>
            <BoltIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {forecast?.overall_confidence.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-purple-700 mt-1">précision MAPE</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Forecast Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BoltIcon className="w-5 h-5 text-amber-600" />
              Prévision des Commandes ({daysAhead} jours)
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-gray-600">Prédiction</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-200 rounded-full"></div>
                <span className="text-gray-600">Intervalle de confiance</span>
              </div>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${value} commandes`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="#fbbf24"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="white"
                  fillOpacity={1}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#d97706"
                  strokeWidth={3}
                  dot={{ fill: '#d97706', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          {forecast?.key_insights && forecast.key_insights.length > 0 && (
            <div className="mt-6 bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h3 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                <InformationCircleIcon className="w-4 h-4" />
                Insights du Modèle
              </h3>
              <ul className="space-y-1">
                {forecast.key_insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                    <span>•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column - Stock Alerts & Chef InformationCircleIcon */}
        <div className="space-y-6">
          {/* Stock Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              Alertes Stock
              {chefDashboard?.stock_alerts && chefDashboard.stock_alerts.length > 0 && (
                <span className="ml-auto px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  {chefDashboard.stock_alerts.length}
                </span>
              )}
            </h2>
            
            {chefDashboard?.stock_alerts && chefDashboard.stock_alerts.length > 0 ? (
              <div className="space-y-3">
                {chefDashboard.stock_alerts.map((alert, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-gray-900">{alert.plat_name}</span>
                      {getRiskBadge(alert.stockout_risk)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Stock actuel:</span>
                        <span className="font-medium">{alert.current_stock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Demande prévue:</span>
                        <span className="font-medium">{alert.predicted_demand}</span>
                      </div>
                      <div className="flex justify-between text-amber-700">
                        <span>Préparer:</span>
                        <span className="font-semibold">+{alert.recommended_prep}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
                </div>
                <p>Aucune alerte stock</p>
                <p className="text-sm">Tous les niveaux sont adéquats</p>
              </div>
            )}
          </div>

          {/* Chef Recommendations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <FireIcon className="w-5 h-5 text-amber-600" />
              Recommandations Chef
            </h2>
            
            {chefDashboard?.prep_recommendations && chefDashboard.prep_recommendations.length > 0 ? (
              <div className="space-y-2">
                {chefDashboard.prep_recommendations.map((rec, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      rec.priority === 'high' 
                        ? 'bg-red-50 border border-red-200' 
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-gray-900">{rec.dish}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                        rec.priority === 'high' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {rec.priority === 'high' ? 'Priorité' : 'Standard'}
                      </span>
                    </div>
                    <span className="font-semibold text-amber-700">
                      {rec.quantity.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Données de préparation en cours de chargement...
              </p>
            )}
          </div>

          {/* Special Events */}
          {chefDashboard?.special_events && chefDashboard.special_events.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <h2 className="text-lg font-semibold text-purple-900 flex items-center gap-2 mb-3">
                <CalendarIcon className="w-5 h-5" />
                Événements Spéciaux
              </h2>
              <ul className="space-y-2">
                {chefDashboard.special_events.map((event, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-purple-800">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    {event}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Trends Section */}
      {weeklyTrend && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
            <CalendarIcon className="w-5 h-5 text-amber-600" />
            Patterns Hebdomadaires
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend.chart_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="predicted" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Insights:</h3>
              {weeklyTrend.insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Technical Info Footer */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-1">À propos du modèle:</p>
            <p>
              Ce système utilise <strong>Prophet (Facebook)</strong>, un algorithme de série temporelle 
              qui détecte automatiquement les tendances, la saisonnalité hebdomadaire/annuelle, 
              et les effets des jours fériés tunisiens (Ramadan, Aïd, etc.). 
              La précision s'améliore avec l'accumulation des données historiques.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
