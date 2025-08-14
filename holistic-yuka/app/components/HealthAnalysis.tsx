import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HealthAnalysis as HealthAnalysisType } from '../types/healthAnalysis';
import { getScoreColor } from '../utils/scoreUtils';

interface HealthAnalysisProps {
  analysis: HealthAnalysisType | null;
  loading: boolean;
}

export const HealthAnalysis: React.FC<HealthAnalysisProps> = ({ analysis, loading }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>🤖 Analyzing product health...</Text>
      </View>
    );
  }

  if (!analysis) {
    return null;
  }


  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#FFCC00';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🤖 AI Health Analysis</Text>
      
      {/* Overall Score */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Overall Health Score</Text>
        <Text style={[styles.overallScore, { color: getScoreColor(analysis.overall_score) }]}>
          {analysis.overall_score}/100
        </Text>
      </View>

      {/* Sub Scores */}
      <View style={styles.subScoresContainer}>
        <Text style={styles.sectionTitle}>Category Scores</Text>
        {Object.entries(analysis.sub_scores).map(([category, score]) => (
          <View key={category} style={styles.subScoreRow}>
            <Text style={styles.subScoreLabel}>
              {category.charAt(0).toUpperCase() + category.slice(1)}:
            </Text>
            <Text style={[styles.subScoreValue, { color: getScoreColor(score) }]}>
              {score}/100
            </Text>
          </View>
        ))}
      </View>

      {/* Red Flags */}
      {analysis.red_flags.length > 0 && (
        <View style={styles.redFlagsContainer}>
          <Text style={styles.sectionTitle}>⚠️ Health Concerns</Text>
          {analysis.red_flags.map((flag, index) => (
            <View key={index} style={styles.redFlagItem}>
              <View style={styles.redFlagHeader}>
                <Text style={styles.redFlagCategory}>{flag.category}</Text>
                <Text style={[styles.redFlagSeverity, { color: getSeverityColor(flag.severity) }]}>
                  {flag.severity.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.redFlagIssue}>{flag.issue}</Text>
              <Text style={styles.redFlagExplanation}>{flag.explanation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendation */}
      <View style={styles.recommendationContainer}>
        <Text style={styles.sectionTitle}>💡 Recommendation</Text>
        <Text style={styles.recommendationText}>{analysis.recommendation}</Text>
      </View>

      {/* Detailed Explanation */}
      <View style={styles.explanationContainer}>
        <Text style={styles.sectionTitle}>📋 Detailed Analysis</Text>
        <Text style={styles.explanationText}>{analysis.explanation}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  scoreContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  overallScore: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  subScoresContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  subScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  subScoreLabel: {
    fontSize: 16,
    color: '#333',
  },
  subScoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  redFlagsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  redFlagItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    paddingLeft: 12,
    marginBottom: 12,
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
  },
  redFlagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  redFlagCategory: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  redFlagSeverity: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  redFlagIssue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  redFlagExplanation: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  recommendationContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recommendationText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  explanationContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});