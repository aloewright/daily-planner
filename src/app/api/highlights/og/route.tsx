import { ImageResponse } from 'next/og'
import { buildRecap, formatMinutes } from '@/lib/highlights'

const DEMO_USER_ID = 'cmp1m2r1l0000yz1ib341e9o5'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hideTitles = searchParams.get('hideTitles') === 'true'
    const userId = searchParams.get('userId') ?? DEMO_USER_ID

    const recap = await buildRecap({ userId, hideTitles })

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #14141b 100%)',
            padding: '56px',
            color: 'white',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(74, 222, 128, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              ✦
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
                Weekly Highlights
              </div>
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                {recap.rangeStart} → {recap.rangeEnd}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 32,
              marginTop: 32,
              padding: '20px 24px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Tasks completed
              </span>
              <span style={{ fontSize: 40, fontWeight: 700, color: '#4ade80', marginTop: 4 }}>
                {recap.totalTasks}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Time invested
              </span>
              <span style={{ fontSize: 40, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>
                {formatMinutes(recap.totalMinutes)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Active days
              </span>
              <span style={{ fontSize: 40, fontWeight: 700, color: '#60a5fa', marginTop: 4 }}>
                {recap.days.length}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28, flex: 1 }}>
            {recap.days.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                No completed tasks in the last 7 days.
              </div>
            ) : (
              recap.days.slice(0, 4).map((day) => (
                <div key={day.date} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {day.label}
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
                      {day.tasks.length} task{day.tasks.length === 1 ? '' : 's'} · {formatMinutes(day.totalMinutes)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {day.tasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 18,
                          color: 'rgba(255,255,255,0.82)',
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: t.channelColor ?? '#4ade80' }} />
                        <span style={{ maxWidth: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </span>
                      </div>
                    ))}
                    {day.tasks.length > 3 && (
                      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginLeft: 18 }}>
                        + {day.tasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 24,
              fontSize: 14,
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            <span>Daily Planner · Highlights</span>
            <span>{recap.generatedAt.slice(0, 10)}</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    )
  } catch (error) {
    console.error('[GET /api/highlights/og]', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}
