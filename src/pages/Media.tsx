import React from 'react';
import { Navigate } from 'react-router-dom';

export default function Media() {
  return <Navigate to="/library?tab=videos" replace />;
}
