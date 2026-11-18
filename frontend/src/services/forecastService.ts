import { request } from './apiClient';
import { modelInfoSchema, predictionSchema, teamListSchema } from '../types/domain';

/** Endpoints de la API del modelo. Las rutas deben coincidir con backend/app/main.py. */
export const forecastService = {
  teams: (signal?: AbortSignal) => request('/api/teams', teamListSchema, { signal }),
  model: (signal?: AbortSignal) => request('/api/model', modelInfoSchema, { signal }),
  predict: (teamA: string, teamB: string, signal?: AbortSignal) =>
    request('/api/predict', predictionSchema, {
      method: 'POST',
      body: { team_a: teamA, team_b: teamB },
      signal,
    }),
};
