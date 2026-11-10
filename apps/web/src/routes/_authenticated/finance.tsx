
import { useEffect, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react"
import type { Place } from "@amlak/shared"
import { useAuth } from "@/lib/auth"
import { getPlaces, expenseslist } from "@/lib/api"
import { S } from "@/lib/dom-style"

import {
  Wallet,
  Building2,
  CalendarDays,
  Receipt,
  Filter,
  TrendingDown,
  FileText,
  AlertCircle,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_authenticated/finance")({
  component: FinancePage,
})

type ExpenseCategory =
  | "MAINTENANCE"
  | "UTILITIES"
  | "TAXES"
  | "CLEANING"
  | "SUPPLIES"
  | "OTHER"

type CategoryKey = "ALL" | ExpenseCategory

interface Expense {
  id: string
  place_id: string
  category: ExpenseCategory
  description: string | null
  amount: string | number
  expense_date: string
  receipt_url: string | null
}

const CATEGORIES: {
  key: CategoryKey
  label: string
}[] = [
  { key: "ALL", label: "الكل" },
  { key: "MAINTENANCE", label: "الصيانة" },
  { key: "UTILITIES", label: "الفواتير" },
  { key: "TAXES", label: "الضرائب" },
  { key: "CLEANING", label: "النظافة" },
  { key: "SUPPLIES", label: "المستلزمات" },
  { key: "OTHER", label: "أخرى" },
]

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MAINTENANCE: "الصيانة",
  UTILITIES: "الفواتير",
  TAXES: "الضرائب",
  CLEANING: "النظافة",
  SUPPLIES: "المستلزمات",
  OTHER: "أخرى",
}

function FinancePage() {
  const { i18n } = useLingui()
  const { accessToken } = useAuth()

  const [places, setPlaces] = useState<Place[] | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [placeFilter, setPlaceFilter] = useState("ALL")
  const [category, setCategory] = useState<CategoryKey>("ALL")

  const [placesLoading, setPlacesLoading] = useState(true)
  const [expensesLoading, setExpensesLoading] = useState(false)

  const [placesError, setPlacesError] = useState("")
  const [expensesError, setExpensesError] = useState("")

  const [now] = useState(() => new Date())

  const isArabic = i18n.locale === "ar"

  const money = new Intl.NumberFormat(isArabic ? "ar" : "en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const day = new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
    dateStyle: "medium",
  })

  const monthLabel = new Intl.DateTimeFormat(
    isArabic ? "ar" : "en",
    {
      month: "long",
      year: "numeric",
    },
  ).format(now)

  // Load places
  useEffect(() => {
    if (!accessToken) return

    let alive = true

    setPlacesLoading(true)
    setPlacesError("")

    getPlaces(accessToken)
      .then((list) => {
        if (alive) setPlaces(list)
      })
      .catch((error) => {
        console.error("Failed to load places:", error)
        if (alive) {
          setPlacesError("تعذر تحميل قائمة الملكيات.")
        }
      })
      .finally(() => {
        if (alive) setPlacesLoading(false)
      })

    return () => {
      alive = false
    }
  }, [accessToken])

  // Load expenses according to selected place
  useEffect(() => {
    if (!accessToken || places === null) return

    let alive = true

    async function loadExpenses() {
      try {
        setExpensesLoading(true)
        setExpensesError("")

        let result: Expense[]

        if (placeFilter === "ALL") {
          const responses = await Promise.all(
            places.map((place) =>
              expenseslist(accessToken!, place.id),
            ),
          )

          result = responses.flat()
        } else {
          result = await expenseslist(accessToken!, placeFilter)
        }

        if (alive) {
          setExpenses(result)
        }
      } catch (error) {
        console.error("Failed to load expenses:", error)

        if (alive) {
          setExpenses([])
          setExpensesError("تعذر تحميل المصروفات. حاول مرة أخرى.")
        }
      } finally {
        if (alive) setExpensesLoading(false)
      }
    }

    loadExpenses()

    return () => {
      alive = false
    }
  }, [accessToken, places, placeFilter])

  // Calculate monthly budget
  const budgetTotal = useMemo(() => {
    return (places ?? [])
      .filter(
        (place) =>
          placeFilter === "ALL" || place.id === placeFilter,
      )
      .reduce(
        (sum, place) =>
          sum + Number(place.monthly_maintenance_budget || 0),
        0,
      )
  }, [places, placeFilter])

  // Filter expenses by category
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(
        (expense) =>
          category === "ALL" || expense.category === category,
      )
      .sort(
        (a, b) =>
          new Date(b.expense_date).getTime() -
          new Date(a.expense_date).getTime(),
      )
  }, [expenses, category])

  // Total expenses
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    )
  }, [filteredExpenses])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      ALL: expenses.length,
      MAINTENANCE: 0,
      UTILITIES: 0,
      TAXES: 0,
      CLEANING: 0,
      SUPPLIES: 0,
      OTHER: 0,
    }

    expenses.forEach((expense) => {
      counts[expense.category]++
    })

    return counts
  }, [expenses])

  // Currency
  const currency =
    places?.find((place) => place.id === placeFilter)?.currency ??
    places?.[0]?.currency ??
    "SAR"

  // Place name
  function getPlaceName(placeId: string) {
    return (
      places?.find((place) => place.id === placeId)?.place_name ??
      placeId
    )
  }

  return (
    <div
      dir="rtl"
      style={S(
        "padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; max-width: 1100px",
      )}
    >
      {/* Header */}
      <div
        style={S(
          "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px",
        )}
      >
        <div
          style={S(
            "display: flex; flex-direction: column; gap: 6px; min-width: 0",
          )}
        >
          <div
            style={S(
              "display: flex; align-items: center; gap: 8px; color: var(--muted-foreground); font-size: 13px",
            )}
          >
            <Wallet size={16} />
            <span>
              <Trans>Finance</Trans>
            </span>
          </div>

          <h1
            style={S(
              "font-size: 28px; font-weight: 800; margin: 0; line-height: 1.3",
            )}
          >
            <Trans>الإدارة المالية</Trans>
          </h1>

          <p
            style={S(
              "font-size: 13px; color: var(--muted-foreground); margin: 0",
            )}
          >
            <Trans>متابعة المصروفات والميزانيات الخاصة بالملكيات.</Trans>
          </p>
        </div>

        <div
          style={S(
            "display: flex; align-items: center; gap: 8px; color: var(--muted-foreground); font-size: 13px",
          )}
        >
          <CalendarDays size={16} />
          {monthLabel}
        </div>
      </div>

      {/* Place filter */}
      <Card
        style={S(
          "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0",
        )}
      >
        <CardHeader
          style={S(
            "padding: 18px 20px; border-bottom: 1px solid var(--border); gap: 4px",
          )}
        >
          <CardTitle style={S("font-size: 17px; font-weight: 750")}>
            <Building2
              size={17}
              style={S(
                "display: inline; vertical-align: middle; margin-inline-end: 7px",
              )}
            />
            <Trans>تصفية حسب الملكية</Trans>
          </CardTitle>
        </CardHeader>

        <CardContent style={S("padding: 20px")}>
          {placesLoading ? (
            <Skeleton style={S("height: 42px; width: 100%; max-width: 420px")} />
          ) : placesError ? (
            <p style={S("color: var(--destructive); font-size: 13px; margin: 0")}>
              {placesError}
            </p>
          ) : (
            <label
              style={S(
                "display: flex; flex-direction: column; gap: 7px; max-width: 420px; font-size: 13px; font-weight: 600",
              )}
            >
              <span>
                <Trans>اختر الملكية</Trans>
              </span>

              <select
                value={placeFilter}
                onChange={(e) => setPlaceFilter(e.target.value)}
                style={S(
                  "height: 42px; padding: 0 12px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); min-width: 0",
                )}
              >
                <option value="ALL">
                  <Trans>جميع الملكيات</Trans>
                </option>

                {places?.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.place_name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div
        style={S(
          "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px",
        )}
      >
        <Card
          className="am-lift"
          style={S(
            "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0",
          )}
        >
          <CardContent
            style={S(
              "padding: 20px; display: flex; flex-direction: column; gap: 14px",
            )}
          >
            <div
              style={S(
                "display: flex; align-items: center; justify-content: space-between; gap: 10px",
              )}
            >
              <span
                style={S(
                  "font-size: 13px; color: var(--muted-foreground); font-weight: 600",
                )}
              >
                <Trans>الميزانية الشهرية</Trans>
              </span>

              <div
                style={S(
                  "width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); color: var(--primary)",
                )}
              >
                <Wallet size={18} />
              </div>
            </div>

            {placesLoading ? (
              <Skeleton style={S("height: 30px; width: 150px")} />
            ) : (
              <div
                style={S(
                  "font-size: 23px; font-weight: 800; direction: ltr; text-align: right",
                )}
              >
                {money.format(budgetTotal)}
                <span
                  style={S(
                    "font-size: 12px; font-weight: 600; color: var(--muted-foreground); margin-inline-start: 6px",
                  )}
                >
                  {currency}
                </span>
              </div>
            )}

            <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
              <Trans>إجمالي الميزانية للملكيات المحددة</Trans>
            </span>
          </CardContent>
        </Card>

        <Card
          className="am-lift"
          style={S(
            "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0",
          )}
        >
          <CardContent
            style={S(
              "padding: 20px; display: flex; flex-direction: column; gap: 14px",
            )}
          >
            <div
              style={S(
                "display: flex; align-items: center; justify-content: space-between; gap: 10px",
              )}
            >
              <span
                style={S(
                  "font-size: 13px; color: var(--muted-foreground); font-weight: 600",
                )}
              >
                <Trans>إجمالي المصروفات</Trans>
              </span>

              <div
                style={S(
                  "width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); color: var(--destructive)",
                )}
              >
                <TrendingDown size={18} />
              </div>
            </div>

            {expensesLoading ? (
              <Skeleton style={S("height: 30px; width: 150px")} />
            ) : (
              <div
                style={S(
                  "font-size: 23px; font-weight: 800; direction: ltr; text-align: right",
                )}
              >
                {money.format(totalExpenses)}
                <span
                  style={S(
                    "font-size: 12px; font-weight: 600; color: var(--muted-foreground); margin-inline-start: 6px",
                  )}
                >
                  {currency}
                </span>
              </div>
            )}

            <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
              <Trans>إجمالي المصروفات حسب التصنيف المحدد</Trans>
            </span>
          </CardContent>
        </Card>

        <Card
          className="am-lift"
          style={S(
            "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0",
          )}
        >
          <CardContent
            style={S(
              "padding: 20px; display: flex; flex-direction: column; gap: 14px",
            )}
          >
            <div
              style={S(
                "display: flex; align-items: center; justify-content: space-between; gap: 10px",
              )}
            >
              <span
                style={S(
                  "font-size: 13px; color: var(--muted-foreground); font-weight: 600",
                )}
              >
                <Trans>عدد المصروفات</Trans>
              </span>

              <div
                style={S(
                  "width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); color: var(--primary)",
                )}
              >
                <Receipt size={18} />
              </div>
            </div>

            {expensesLoading ? (
              <Skeleton style={S("height: 30px; width: 80px")} />
            ) : (
              <div style={S("font-size: 23px; font-weight: 800")}>
                {filteredExpenses.length}
              </div>
            )}

            <span style={S("font-size: 12px; color: var(--muted-foreground)")}>
              <Trans>عدد السجلات المعروضة</Trans>
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Expenses */}
      <Card
        style={S(
          "padding: 0; border: 1px solid var(--border); overflow: hidden; gap: 0",
        )}
      >
        <CardHeader
          style={S(
            "padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px",
          )}
        >
          <div style={S("display: flex; flex-direction: column; gap: 5px")}>
            <CardTitle style={S("font-size: 17px; font-weight: 750")}>
              <Receipt
                size={17}
                style={S(
                  "display: inline; vertical-align: middle; margin-inline-end: 7px",
                )}
              />
              <Trans>سجل المصروفات</Trans>

              <span
                style={S(
                  "margin-inline-start: 8px; font-size: 12px; font-weight: 600; color: var(--muted-foreground); border: 1px solid var(--border); padding: 2px 8px",
                )}
              >
                {filteredExpenses.length}
              </span>
            </CardTitle>

            <p style={S("font-size: 12px; color: var(--muted-foreground); margin: 0")}>
              <Trans>جميع المصروفات المسجلة للملكيات.</Trans>
            </p>
          </div>

          <Filter
            size={18}
            style={S("color: var(--muted-foreground); flex-shrink: 0")}
          />
        </CardHeader>

        <CardContent
          style={S("padding: 20px; display: flex; flex-direction: column; gap: 18px")}
        >
          {/* Category filters */}
          <div
            style={S(
              "display: flex; align-items: center; gap: 8px; flex-wrap: wrap",
            )}
          >
            {CATEGORIES.map((item) => {
              const active = category === item.key

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory(item.key)}
                  className="am-btn"
                  style={S(
                    `height: 36px; padding: 0 13px; display: flex; align-items: center; gap: 7px; border: 1px solid ${active ? "var(--primary)" : "var(--border)"}; background: ${active ? "var(--primary)" : "var(--card)"}; color: ${active ? "var(--primary-foreground)" : "var(--foreground)"}; font-size: 12px; font-weight: 600`,
                  )}
                >
                  {item.label}

                  <span
                    style={S(
                      `font-size: 11px; opacity: .8`,
                    )}
                  >
                    {categoryCounts[item.key]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Loading */}
          {expensesLoading && (
            <div style={S("display: flex; flex-direction: column; gap: 10px")}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} style={S("height: 82px")} />
              ))}
            </div>
          )}

          {/* Error */}
          {!expensesLoading && expensesError && (
            <div
              style={S(
                "display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 32px 16px; border: 1px dashed var(--border); text-align: center",
              )}
            >
              <AlertCircle
                size={28}
                style={S("color: var(--destructive)")}
              />

              <p style={S("font-size: 14px; font-weight: 650; margin: 0")}>
                <Trans>تعذر تحميل المصروفات</Trans>
              </p>

              <p style={S("font-size: 13px; color: var(--muted-foreground); margin: 0")}>
                {expensesError}
              </p>
            </div>
          )}

          {/* Empty */}
          {!expensesLoading &&
            !expensesError &&
            filteredExpenses.length === 0 && (
              <div
                style={S(
                  "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 36px 16px; border: 1px dashed var(--border); text-align: center",
                )}
              >
                <FileText
                  size={28}
                  style={S("color: var(--muted-foreground)")}
                />

                <p style={S("font-size: 14px; font-weight: 650; margin: 0")}>
                  <Trans>لا توجد مصروفات</Trans>
                </p>

                <p style={S("font-size: 13px; color: var(--muted-foreground); margin: 0")}>
                  <Trans>لا توجد مصروفات تطابق خيارات التصفية المحددة.</Trans>
                </p>
              </div>
            )}

          {/* Expense list */}
          {!expensesLoading &&
            !expensesError &&
            filteredExpenses.length > 0 && (
              <div
                style={S(
                  "display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px",
                )}
              >
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="am-lift"
                    style={S(
                      "display: flex; flex-direction: column; gap: 13px; min-width: 0; border: 1px solid var(--border); padding: 16px; background: var(--card)",
                    )}
                  >
                    {/* Expense title */}
                    <div
                      style={S(
                        "display: flex; align-items: flex-start; justify-content: space-between; gap: 10px",
                      )}
                    >
                      <div
                        style={S(
                          "display: flex; flex-direction: column; gap: 5px; min-width: 0",
                        )}
                      >
                        <span
                          style={S(
                            "font-size: 14px; font-weight: 750; overflow-wrap: anywhere",
                          )}
                        >
                          {expense.description ||
                            CATEGORY_LABELS[expense.category]}
                        </span>

                        <span
                          style={S(
                            "font-size: 12px; color: var(--muted-foreground)",
                          )}
                        >
                          {CATEGORY_LABELS[expense.category]}
                        </span>
                      </div>

                      <div
                        style={S(
                          "width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); color: var(--muted-foreground); flex-shrink: 0",
                        )}
                      >
                        <Receipt size={16} />
                      </div>
                    </div>

                    {/* Amount */}
                    <div
                      style={S(
                        "font-size: 20px; font-weight: 800; direction: ltr; text-align: right",
                      )}
                    >
                      {money.format(Number(expense.amount))}
                      <span
                        style={S(
                          "font-size: 11px; font-weight: 600; color: var(--muted-foreground); margin-inline-start: 5px",
                        )}
                      >
                        {currency}
                      </span>
                    </div>

                    <div
                      style={S(
                        "border-top: 1px solid var(--border); padding-top: 11px; display: flex; flex-direction: column; gap: 9px",
                      )}
                    >
                      <div
                        style={S(
                          "display: flex; align-items: center; gap: 7px; color: var(--muted-foreground); font-size: 12px; min-width: 0",
                        )}
                      >
                        <Building2 size={14} />
                        <span style={S("overflow-wrap: anywhere")}>
                          {getPlaceName(expense.place_id)}
                        </span>
                      </div>

                      <div
                        style={S(
                          "display: flex; align-items: center; gap: 7px; color: var(--muted-foreground); font-size: 12px",
                        )}
                      >
                        <CalendarDays size={14} />
                        <span>
                          {day.format(new Date(expense.expense_date))}
                        </span>
                      </div>

                      {expense.receipt_url && (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="am-btn"
                          style={S(
                            "height: 34px; display: flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--border); color: var(--foreground); font-size: 12px; text-decoration: none; margin-top: 3px",
                          )}
                        >
                          <FileText size={14} />
                          <Trans>عرض الإيصال</Trans>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
