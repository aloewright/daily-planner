'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export interface PdfChannel {
  name: string
  color: string
  minutes: number
}

export interface PdfDay {
  date: string
  totalMinutes: number
  byChannel: { name: string; minutes: number }[]
}

export interface PdfCsvRow {
  date: string
  channel: string
  title: string
  plannedTime: number
  actualTime: number
}

export interface AnalyticsReportProps {
  weekLabel: string
  totalMinutes: number
  byChannel: PdfChannel[]
  byDay: PdfDay[]
  csvRows: PdfCsvRow[]
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#ffffff', color: '#111111', padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 10, color: '#666666' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#666666', marginBottom: 8 },
  bigNumber: { fontSize: 36, fontWeight: 700 },
  bigNumberLabel: { fontSize: 10, color: '#666666' },
  channelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  channelSwatch: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  channelName: { flex: 1, fontSize: 10 },
  channelMinutes: { fontSize: 10, color: '#444444' },
  channelPct: { fontSize: 10, color: '#888888', width: 40, textAlign: 'right' },
  table: { borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingVertical: 6, backgroundColor: '#f8f8f8' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 4 },
  th: { fontSize: 9, fontWeight: 700, color: '#555555', paddingHorizontal: 4 },
  td: { fontSize: 9, color: '#222222', paddingHorizontal: 4 },
  colDate: { width: '14%' },
  colChannel: { width: '22%' },
  colTitle: { width: '44%' },
  colPlanned: { width: '10%', textAlign: 'right' },
  colActual: { width: '10%', textAlign: 'right' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dayDate: { fontSize: 10, fontWeight: 700, width: '20%' },
  dayChannels: { fontSize: 9, color: '#666666', flex: 1 },
  dayTotal: { fontSize: 10, fontWeight: 700, width: '12%', textAlign: 'right' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#999999', textAlign: 'center' },
})

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatHours(mins: number): string {
  return (mins / 60).toFixed(1)
}

export function AnalyticsReportPdf({
  weekLabel,
  totalMinutes,
  byChannel,
  byDay,
  csvRows,
}: AnalyticsReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Weekly Analytics</Text>
            <Text style={styles.subtitle}>{weekLabel}</Text>
          </View>
          <Text style={styles.subtitle}>Generated {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Totals</Text>
          <Text style={styles.bigNumber}>{formatHours(totalMinutes)}</Text>
          <Text style={styles.bigNumberLabel}>hours tracked</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Channel</Text>
          {byChannel.length === 0 ? (
            <Text style={{ fontSize: 10, color: '#888888' }}>No data</Text>
          ) : (
            byChannel.map((ch) => {
              const pct = totalMinutes > 0 ? Math.round((ch.minutes / totalMinutes) * 100) : 0
              return (
                <View key={ch.name} style={styles.channelRow}>
                  <View style={[styles.channelSwatch, { backgroundColor: ch.color }]} />
                  <Text style={styles.channelName}>{ch.name}</Text>
                  <Text style={styles.channelMinutes}>{formatMinutes(ch.minutes)}</Text>
                  <Text style={styles.channelPct}>{pct}%</Text>
                </View>
              )
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
          {byDay.length === 0 ? (
            <Text style={{ fontSize: 10, color: '#888888' }}>No data</Text>
          ) : (
            byDay.map((d) => (
              <View key={d.date} style={styles.dayRow}>
                <Text style={styles.dayDate}>{d.date}</Text>
                <Text style={styles.dayChannels}>
                  {d.byChannel.map((c) => `${c.name} ${formatMinutes(c.minutes)}`).join(' · ')}
                </Text>
                <Text style={styles.dayTotal}>{formatMinutes(d.totalMinutes)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Tasks</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colDate]}>Date</Text>
              <Text style={[styles.th, styles.colChannel]}>Channel</Text>
              <Text style={[styles.th, styles.colTitle]}>Title</Text>
              <Text style={[styles.th, styles.colPlanned]}>Planned</Text>
              <Text style={[styles.th, styles.colActual]}>Actual</Text>
            </View>
            {csvRows.length === 0 ? (
              <Text style={{ fontSize: 10, color: '#888888', padding: 8 }}>No completed tasks</Text>
            ) : (
              csvRows.map((r, i) => (
                <View key={i} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.td, styles.colDate]}>{r.date}</Text>
                  <Text style={[styles.td, styles.colChannel]}>{r.channel}</Text>
                  <Text style={[styles.td, styles.colTitle]}>{r.title}</Text>
                  <Text style={[styles.td, styles.colPlanned]}>{formatMinutes(r.plannedTime)}</Text>
                  <Text style={[styles.td, styles.colActual]}>{formatMinutes(r.actualTime)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
