'use strict';
// =====================================================
// STATE
// =====================================================
function MK(){
  return{
    cash:10000,ar:0,notes_rec:0,inventory:0,prepaid:0,
    advance_paid:0,short_loan_out:0,accrued_int:0,prepaid_tax_pay:0,
    equipment:0,acc_dep_eq:0,building:0,acc_dep_bld:0,land:0,
    goodwill:0,investment:0,deposit:0,deferred_tax_a:0,rou_asset:0,oc_asset:0,
    ap:0,advance_rec:0,accrued_exp:0,short_loan:0,tax_pay:0,
    bad_debt_allow:0,warranty_prov:0,restr_prov:0,
    long_loan:0,bond:0,lease_liability:0,retire_allow:0,deferred_tax_l:0,
    capital:10000,capital_reserve:0,treasury_stock:0,retained:0,oci:0,minority:0,
    sales:0,purchase:0,begin_inv:0,cogs_adj:0,
    salary_exp:0,ad_exp:0,rd_exp:0,dep_exp:0,bad_debt_exp:0,
    retire_exp:0,prepaid_exp_used:0,warranty_exp:0,restr_exp:0,other_opex:0,
    interest_exp:0,fx_loss_amt:0,equity_loss:0,impairment_exp:0,
    goodwill_amort:0,inv_val_loss:0,sell_loss_amt:0,other_nonop_exp:0,
    interest_inc:0,dividend_inc:0,fx_gain_amt:0,equity_inc:0,
    inv_val_gain:0,sell_gain_amt:0,other_nonop_inc:0,
    tax_exp:0,deferred_tax_exp:0,
    cf_ops:0,cf_inv:0,cf_fin:0,
    prev_ar:0,prev_inv:0,prev_ap:0,prev_accrued:0,prev_prepaid:0,
    period:1
  };
}
var S=MK();
var txnCount=0;
var currentLv=1;

// =====================================================
// COMPUTED
// =====================================================
function C(s){
  var cogs=s.purchase+s.begin_inv-s.inventory+s.cogs_adj;
  var grossP=s.sales-cogs;
  var opex=s.salary_exp+s.ad_exp+s.rd_exp+s.dep_exp+s.bad_debt_exp
          +s.retire_exp+s.prepaid_exp_used+s.warranty_exp+s.restr_exp+s.other_opex;
  var ebit=grossP-opex;
  var nonOpInc=s.interest_inc+s.dividend_inc+s.fx_gain_amt+s.equity_inc
              +s.inv_val_gain+s.sell_gain_amt+s.other_nonop_inc;
  var nonOpExp=s.interest_exp+s.fx_loss_amt+s.equity_loss+s.inv_val_loss
              +s.impairment_exp+s.goodwill_amort+s.sell_loss_amt+s.other_nonop_exp;
  var ebt=ebit+nonOpInc-nonOpExp;
  var ni=ebt-s.tax_exp-s.deferred_tax_exp;
  var totCA=s.cash+s.ar+s.notes_rec+s.inventory+s.prepaid
           +s.advance_paid+s.short_loan_out+s.accrued_int+s.prepaid_tax_pay
           -s.bad_debt_allow;
  var totFA=(s.equipment-s.acc_dep_eq)+(s.building-s.acc_dep_bld)
           +s.land+s.goodwill+s.investment+s.deposit
           +s.deferred_tax_a+s.rou_asset+s.oc_asset;
  var totA=totCA+totFA;
  var totCL=s.ap+s.advance_rec+s.accrued_exp+s.short_loan
           +s.tax_pay+s.warranty_prov+s.restr_prov;
  var totLL=s.long_loan+s.bond+s.lease_liability+s.retire_allow+s.deferred_tax_l;
  var totL=totCL+totLL;
  var totEq=s.capital+s.capital_reserve-s.treasury_stock
           +s.retained+ni+s.oci+s.minority;
  var nonCash=s.dep_exp+s.bad_debt_exp+s.goodwill_amort+s.impairment_exp+s.retire_exp;
  var dAR=-(s.ar-s.prev_ar);
  var dINV=-(s.inventory-s.prev_inv);
  var dAP=(s.ap-s.prev_ap);
  var dAccrued=(s.accrued_exp-s.prev_accrued);
  var dPrepaid=-(s.prepaid-s.prev_prepaid);
  var cfOp_sub=ni+nonCash+dAR+dINV+dAP+dAccrued+dPrepaid;
  var cfOp=cfOp_sub-s.tax_exp+s.tax_pay;
  var netSales=s.sales;
  var dso=netSales>0?(s.ar/(netSales/365)):0;
  var dpo=cogs>0?(s.ap/(cogs/365)):0;
  var dio=cogs>0?(s.inventory/(cogs/365)):0;
  var ccc=dso+dio-dpo;
  return{cogs,grossP,opex,ebit,nonOpInc,nonOpExp,ebt,ni,
         totCA,totFA,totA,totCL,totLL,totL,totEq,
         nonCash,dAR,dINV,dAP,dAccrued,dPrepaid,cfOp_sub,cfOp,
         dso,dpo,dio,ccc};
}

// =====================================================
// FORMAT
// =====================================================
function fmt(v){
  if(v===0)return'—';
  var a=Math.abs(Math.round(v));
  return(v<0?'-':'')+'¥'+a.toLocaleString('ja-JP');
}
function vc(v){return v>0?'val-pos':v<0?'val-neg':'val-zero';}
function pct(v){return(v*100).toFixed(1)+'%';}

// =====================================================
// TRANSACTIONS
// =====================================================
var T={
  cash_sales:function(s){s.cash+=5000;s.sales+=5000;s.cf_ops+=5000;return{dr:'現金 ¥5,000',cr:'売上 ¥5,000',note:'現金売上。CF 営業活動CF(+)。売上収益が発生し現金が増加します。'};},
  credit_sales:function(s){s.ar+=3000;s.sales+=3000;return{dr:'売掛金(AR) ¥3,000',cr:'売上 ¥3,000',note:'掛売上。売掛金（AR）が資産として増加します。後で現金回収。'};},
  collect_ar:function(s){if(s.ar<=0)return null;var a=Math.min(s.ar,3000);s.cash+=a;s.ar-=a;s.cf_ops+=a;return{dr:'現金 ¥'+a,cr:'売掛金(AR) ¥'+a,note:'売掛金の回収。AR が現金に転換。CF 営業活動CF(+)。'};},
  receive_advance:function(s){s.cash+=2000;s.advance_rec+=2000;return{dr:'現金 ¥2,000',cr:'前受金 ¥2,000',note:'代金先受け。前受金は負債（未来の履行義務）。現金は増えるが収益ではない。'};},
  advance_to_sales:function(s){if(s.advance_rec<=0)return null;var a=Math.min(s.advance_rec,2000);s.advance_rec-=a;s.sales+=a;return{dr:'前受金 ¥'+a,cr:'売上 ¥'+a,note:'前受金を売上に振替。履行義務充足時点で収益認識（IFRS15 の5ステップ）。'};},
  interest_income:function(s){s.accrued_int+=500;s.interest_inc+=500;return{dr:'未収利息 ¥500',cr:'受取利息 ¥500',note:'利息未収計上。発生主義に基づき当期収益として認識。'};},
  collect_interest:function(s){if(s.accrued_int<=0)return null;var a=s.accrued_int;s.cash+=a;s.accrued_int=0;s.cf_ops+=a;return{dr:'現金 ¥'+a,cr:'未収利息 ¥'+a,note:'利息受取。CF 営業活動CF(+)。'};},
  dividend_income:function(s){s.cash+=800;s.dividend_inc+=800;s.cf_ops+=800;return{dr:'現金 ¥800',cr:'受取配当金 ¥800',note:'受取配当金。営業外収益に分類。'};},
  fx_gain:function(s){s.cash+=600;s.fx_gain_amt+=600;s.cf_ops+=600;return{dr:'現金 ¥600',cr:'為替差益 ¥600',note:'為替差益。外貨建取引の決済・評価による利益。'};},
  fx_loss:function(s){s.cash-=400;s.fx_loss_amt+=400;s.cf_ops-=400;return{dr:'為替差損 ¥400',cr:'現金 ¥400',note:'為替差損。外貨建取引の決済・評価による損失。'};},
  fx_translation_adj:function(s){s.oci+=300;return{dr:'為替換算調整勘定 ¥300',cr:'その他包括利益(OCI) ¥300',note:'在外子会社の換算差額。PL を通過せず OCI に計上。'};},
  forward_contract_gain:function(s){s.cash+=800;s.other_nonop_inc+=800;s.cf_ops+=800;return{dr:'現金 ¥800',cr:'先物予約差益 ¥800',note:'先物為替予約の決済差益。営業外収益。'};},
  forward_contract_loss:function(s){s.cash-=600;s.other_nonop_exp+=600;s.cf_ops-=600;return{dr:'先物予約差損 ¥600',cr:'現金 ¥600',note:'先物為替予約の決済差損。営業外費用。'};},
  equity_method_income:function(s){s.investment+=1000;s.equity_inc+=1000;return{dr:'投資有価証券 ¥1,000',cr:'持分法投資利益 ¥1,000',note:'持分法：関連会社の当期純利益を持分比率で取込。'};},
  equity_method_loss:function(s){if(s.investment<800)return null;s.investment-=800;s.equity_loss+=800;return{dr:'持分法投資損失 ¥800',cr:'投資有価証券 ¥800',note:'持分法：関連会社の当期純損失を持分比率で取込。'};},
  cash_purchase:function(s){s.cash-=2000;s.purchase+=2000;s.cf_ops-=2000;return{dr:'仕入 ¥2,000',cr:'現金 ¥2,000',note:'現金仕入。三分法使用。CF 営業活動CF(-)。'};},
  credit_purchase:function(s){s.ap+=1500;s.purchase+=1500;return{dr:'仕入 ¥1,500',cr:'買掛金(AP) ¥1,500',note:'掛仕入。買掛金（AP）が負債として増加。'};},
  pay_ap:function(s){if(s.ap<=0)return null;var a=Math.min(s.ap,1500);s.cash-=a;s.ap-=a;s.cf_ops-=a;return{dr:'買掛金(AP) ¥'+a,cr:'現金 ¥'+a,note:'買掛金支払。CF 営業活動CF(-)。'};},
  pay_salary:function(s){s.cash-=1500;s.salary_exp+=1500;s.cf_ops-=1500;return{dr:'給与 ¥1,500',cr:'現金 ¥1,500',note:'給与支払。販管費。CF 営業活動CF(-)。'};},
  accrue_salary:function(s){s.accrued_exp+=800;s.salary_exp+=800;return{dr:'給与 ¥800',cr:'未払費用 ¥800',note:'未払給与計上。発生主義：現金未払いでも当期費用に計上。'};},
  pay_accrued:function(s){if(s.accrued_exp<=0)return null;var a=Math.min(s.accrued_exp,800);s.cash-=a;s.accrued_exp-=a;s.cf_ops-=a;return{dr:'未払費用 ¥'+a,cr:'現金 ¥'+a,note:'未払費用の現金支払。CF 営業活動CF(-)。'};},
  ad_expense:function(s){s.cash-=500;s.ad_exp+=500;s.cf_ops-=500;return{dr:'広告宣伝費 ¥500',cr:'現金 ¥500',note:'広告宣伝費。販管費に分類。CF 営業活動CF(-)。'};},
  rd_expense:function(s){s.cash-=1000;s.rd_exp+=1000;s.cf_ops-=1000;return{dr:'研究開発費 ¥1,000',cr:'現金 ¥1,000',note:'研究開発費。日本基準では全額費用処理（資産計上不可）。'};},
  prepaid_expense:function(s){s.cash-=600;s.prepaid+=600;return{dr:'前払費用 ¥600',cr:'現金 ¥600',note:'費用前払い。支払時は前払費用（資産）として計上。'};},
  expense_prepaid:function(s){if(s.prepaid<=0)return null;var a=Math.min(s.prepaid,600);s.prepaid-=a;s.prepaid_exp_used+=a;return{dr:'各費用 ¥'+a,cr:'前払費用 ¥'+a,note:'前払費用を当期費用に振替。期間対応の原則。'};},
  prepay_advance:function(s){s.cash-=300;s.advance_paid+=300;return{dr:'仮払金 ¥300',cr:'現金 ¥300',note:'仮払金。内容未確定の支払（資産）。後で適切な科目に振替。'};},
  settle_advance:function(s){if(s.advance_paid<=0)return null;var a=s.advance_paid;s.advance_paid=0;s.other_opex+=a;return{dr:'各費用 ¥'+a,cr:'仮払金 ¥'+a,note:'仮払金精算。確定した費用科目に振替。'};},
  pay_interest:function(s){s.cash-=200;s.interest_exp+=200;s.cf_ops-=200;return{dr:'支払利息 ¥200',cr:'現金 ¥200',note:'借入利息支払。営業外費用。CF 営業活動CF(-)。'};},
  accrue_bad_debt:function(s){s.bad_debt_allow+=300;s.bad_debt_exp+=300;return{dr:'貸倒引当金繰入 ¥300',cr:'貸倒引当金 ¥300',note:'売掛金に対する貸倒リスクを見積もり引当金設定。'};},
  bad_debt_writeoff:function(s){if(s.ar<=0||s.bad_debt_allow<=0)return null;var a=Math.min(s.ar,s.bad_debt_allow,500);s.ar-=a;s.bad_debt_allow-=a;return{dr:'貸倒引当金 ¥'+a,cr:'売掛金 ¥'+a,note:'貸倒実際発生。引当金と相殺（PL 影響なし）。'};},
  accrue_retirement:function(s){s.retire_allow+=1000;s.retire_exp+=1000;return{dr:'退職給付費用 ¥1,000',cr:'退職給付引当金 ¥1,000',note:'退職給付引当金計上。固定負債に分類。'};},
  pay_retirement:function(s){if(s.retire_allow<=0)return null;var a=Math.min(s.retire_allow,1000);s.cash-=a;s.retire_allow-=a;s.cf_ops-=a;return{dr:'退職給付引当金 ¥'+a,cr:'現金 ¥'+a,note:'退職給付実際支払。CF 営業活動CF(-)。'};},
  warranty_provision:function(s){s.warranty_prov+=500;s.warranty_exp+=500;return{dr:'製品保証費用 ¥500',cr:'製品保証引当金 ¥500',note:'製品保証引当金設定。将来費用を現在に認識。'};},
  restructuring_provision:function(s){s.restr_prov+=2000;s.restr_exp+=2000;return{dr:'リストラ費用 ¥2,000',cr:'リストラ引当金 ¥2,000',note:'リストラクチャリング引当金。IAS37 に基づく計上。'};},
  closing_begin_inv:function(s){var a=s.inventory;if(a<=0)return null;s.purchase+=a;s.begin_inv+=a;s.inventory=0;return{dr:'仕入 ¥'+a,cr:'繰越商品 ¥'+a,note:'三分法：期首商品を仕入勘定に振替。売上原価計算第1ステップ。'};},
  closing_end_inv:function(s){s.inventory=500;s.cogs_adj=-500;return{dr:'繰越商品 ¥500',cr:'仕入 ¥500',note:'三分法：期末棚卸高を繰越商品（資産）に振替。売上原価＝期首＋仕入－期末。'};},
  inventory_loss:function(s){if(s.inventory<=0)return null;var a=Math.min(s.inventory,100);s.inventory-=a;s.other_opex+=a;return{dr:'棚卸減耗損 ¥'+a,cr:'繰越商品 ¥'+a,note:'棚卸減耗損。実地棚卸で発覚した数量不足。'};},
  inventory_writedown:function(s){if(s.inventory<=0)return null;var a=Math.min(s.inventory,150);s.inventory-=a;s.other_opex+=a;return{dr:'商品評価損 ¥'+a,cr:'繰越商品 ¥'+a,note:'正味売却価額＜帳簿価額。低価法（強制適用）。'};},
  buy_equipment:function(s){s.cash-=3000;s.equipment+=3000;s.cf_inv-=3000;return{dr:'機械設備 ¥3,000',cr:'現金 ¥3,000',note:'設備購入。固定資産計上。CF 投資活動CF(-)。'};},
  buy_building:function(s){s.cash-=5000;s.building+=5000;s.cf_inv-=5000;return{dr:'建物 ¥5,000',cr:'現金 ¥5,000',note:'建物購入。固定資産計上。CF 投資活動CF(-)。'};},
  buy_land:function(s){s.cash-=4000;s.land+=4000;s.cf_inv-=4000;return{dr:'土地 ¥4,000',cr:'現金 ¥4,000',note:'土地購入。非減価償却資産。CF 投資活動CF(-)。'};},
  sell_asset:function(s){if(s.equipment<1000)return null;s.cash+=1500;s.equipment-=1000;s.sell_gain_amt+=500;s.cf_inv+=1500;return{dr:'現金 ¥1,500',cr:'機械設備 ¥1,000 / 固定資産売却益 ¥500',note:'帳簿価額¥1,000 を¥1,500 で売却。売却益¥500 は PL 営業外収益。CF 投資CF(+)。'};},
  sell_asset_loss:function(s){if(s.equipment<1000)return null;s.cash+=700;s.equipment-=1000;s.sell_loss_amt+=300;s.cf_inv+=700;return{dr:'現金 ¥700 / 固定資産売却損 ¥300',cr:'機械設備 ¥1,000',note:'帳簿価額¥1,000 を¥700 で売却。売却損¥300 は PL 営業外費用。CF 投資CF(+)。'};},
  depreciation:function(s){if(s.equipment===0&&s.building===0)return null;var a=s.equipment>0?500:300;if(s.equipment>0)s.acc_dep_eq+=a;else s.acc_dep_bld+=a;s.dep_exp+=a;return{dr:'減価償却費 ¥'+a,cr:'減価償却累計額 ¥'+a,note:'定額法。非現金取引のため CF 間接法で純利益に加算。'};},
  impairment:function(s){if(s.equipment===0&&s.goodwill===0)return null;var a=500;if(s.goodwill>=a)s.goodwill-=a;else if(s.equipment>=a)s.equipment-=a;s.impairment_exp+=a;return{dr:'減損損失 ¥'+a,cr:'固定資産/のれん ¥'+a,note:'収益性低下による減損損失（IAS36）。'};},
  buy_goodwill:function(s){s.cash-=4000;s.goodwill+=4000;s.cf_inv-=4000;return{dr:'のれん ¥4,000',cr:'現金 ¥4,000',note:'M&A のれん。無形固定資産。CF 投資活動CF(-)。日本基準：20年以内均等償却。'};},
  amortize_goodwill:function(s){if(s.goodwill<=0)return null;var a=Math.min(s.goodwill,400);s.goodwill-=a;s.goodwill_amort+=a;return{dr:'のれん償却 ¥'+a,cr:'のれん ¥'+a,note:'のれん定額償却。日本基準は20年以内。IFRS は非償却（減損テスト）。'};},
  pay_deposit:function(s){s.cash-=1000;s.deposit+=1000;s.cf_inv-=1000;return{dr:'敷金・保証金 ¥1,000',cr:'現金 ¥1,000',note:'敷金（保証金）。投資その他の資産。CF 投資活動CF(-)。'};},
  buy_investment:function(s){s.cash-=2000;s.investment+=2000;s.cf_inv-=2000;return{dr:'投資有価証券 ¥2,000',cr:'現金 ¥2,000',note:'長期投資目的株式取得。固定資産（投資等）。CF 投資活動CF(-)。'};},
  sell_investment:function(s){if(s.investment<1000)return null;s.cash+=1200;s.investment-=1000;s.sell_gain_amt+=200;s.cf_inv+=1200;return{dr:'現金 ¥1,200',cr:'投資有価証券 ¥1,000 / 売却益 ¥200',note:'投資有価証券売却。CF 投資活動CF(+)。'};},
  invest_valuation_up:function(s){s.investment+=500;s.inv_val_gain+=500;return{dr:'投資有価証券 ¥500',cr:'有価証券評価差額金(OCI) ¥500',note:'時価評価益。その他包括利益（OCI）に計上。PL を通過しない。'};},
  invest_valuation_dn:function(s){if(s.investment<400)return null;s.investment-=400;s.inv_val_loss+=400;return{dr:'投資有価証券評価損 ¥400',cr:'投資有価証券 ¥400',note:'著しい下落（通常50%超）→ PL 評価損として強制認識。'};},
  borrow_short:function(s){s.cash+=3000;s.short_loan+=3000;s.cf_fin+=3000;return{dr:'現金 ¥3,000',cr:'短期借入金 ¥3,000',note:'短期借入（1年以内返済）。流動負債。CF 財務活動CF(+)。'};},
  repay_short:function(s){if(s.short_loan<=0)return null;var a=Math.min(s.short_loan,3000);s.cash-=a;s.short_loan-=a;s.cf_fin-=a;return{dr:'短期借入金 ¥'+a,cr:'現金 ¥'+a,note:'短期借入返済。CF 財務活動CF(-)。'};},
  borrow_long:function(s){s.cash+=5000;s.long_loan+=5000;s.cf_fin+=5000;return{dr:'現金 ¥5,000',cr:'長期借入金 ¥5,000',note:'長期借入（1年超）。固定負債。CF 財務活動CF(+)。'};},
  repay_long:function(s){if(s.long_loan<=0)return null;var a=Math.min(s.long_loan,5000);s.cash-=a;s.long_loan-=a;s.cf_fin-=a;return{dr:'長期借入金 ¥'+a,cr:'現金 ¥'+a,note:'長期借入返済。CF 財務活動CF(-)。'};},
  short_loan_out:function(s){s.cash-=1000;s.short_loan_out+=1000;s.cf_inv-=1000;return{dr:'短期貸付金 ¥1,000',cr:'現金 ¥1,000',note:'他社への短期貸付。流動資産。CF 投資活動CF(-)。'};},
  collect_loan_out:function(s){if(s.short_loan_out<=0)return null;var a=Math.min(s.short_loan_out,1000);s.cash+=a;s.short_loan_out-=a;s.cf_inv+=a;return{dr:'現金 ¥'+a,cr:'短期貸付金 ¥'+a,note:'貸付金回収。CF 投資活動CF(+)。'};},
  issue_bond:function(s){s.cash+=5000;s.bond+=5000;s.cf_fin+=5000;return{dr:'現金 ¥5,000',cr:'社債 ¥5,000',note:'社債発行。固定負債。CF 財務活動CF(+)。'};},
  redeem_bond:function(s){if(s.bond<=0)return null;var a=Math.min(s.bond,5000);s.cash-=a;s.bond-=a;s.cf_fin-=a;return{dr:'社債 ¥'+a,cr:'現金 ¥'+a,note:'社債償還。CF 財務活動CF(-)。'};},
  issue_stock:function(s){s.cash+=3000;s.capital+=1500;s.capital_reserve+=1500;s.cf_fin+=3000;return{dr:'現金 ¥3,000',cr:'資本金 ¥1,500 / 資本準備金 ¥1,500',note:'株式発行。払込額の1/2ずつ資本金・資本準備金に計上。CF 財務活動CF(+)。'};},
  buy_treasury:function(s){s.cash-=1000;s.treasury_stock+=1000;s.cf_fin-=1000;return{dr:'自己株式 ¥1,000',cr:'現金 ¥1,000',note:'自己株式取得。純資産の控除項目。CF 財務活動CF(-)。'};},
  cancel_treasury:function(s){if(s.treasury_stock<=0)return null;var a=s.treasury_stock;s.capital_reserve=Math.max(0,s.capital_reserve-a);s.treasury_stock=0;return{dr:'資本準備金 ¥'+a,cr:'自己株式 ¥'+a,note:'自己株式消却。資本準備金と相殺。純資産総額は変わらない。'};},
  pay_dividend:function(s){var cv=C(s);if(s.retained+cv.ni<500)return null;s.cash-=500;s.retained-=500;s.cf_fin-=500;return{dr:'繰越利益剰余金 ¥500',cr:'現金 ¥500',note:'配当支払。利益剰余金減少。CF 財務活動CF(-)。'};},
  stock_option:function(s){s.oc_asset+=300;s.other_opex+=300;return{dr:'株式報酬費用 ¥300',cr:'新株予約権 ¥300',note:'ストックオプション費用化。非現金取引。IFRS2 準拠。'};},
  oci_item:function(s){s.oci+=500;return{dr:'各OCI資産 ¥500',cr:'その他包括利益(OCI) ¥500',note:'その他包括利益。純利益には含まれないが純資産に計上される。'};},
  minority_interest:function(s){s.minority+=1000;s.cash+=1000;s.cf_fin+=1000;return{dr:'現金 ¥1,000',cr:'非支配株主持分 ¥1,000',note:'連結子会社の非支配株主持分計上。CF 財務活動CF(+)。'};},
  accrue_tax:function(s){s.tax_pay+=1200;s.tax_exp+=1200;return{dr:'法人税等 ¥1,200',cr:'未払法人税等 ¥1,200',note:'法人税等計上。確定申告前の見積額。'};},
  pay_tax:function(s){if(s.tax_pay<=0)return null;var a=s.tax_pay;s.cash-=a;s.tax_pay=0;s.cf_ops-=a;return{dr:'未払法人税等 ¥'+a,cr:'現金 ¥'+a,note:'法人税等支払。CF 営業活動CF(-)。'};},
  prepaid_tax:function(s){s.cash-=600;s.prepaid_tax_pay+=600;s.cf_ops-=600;return{dr:'仮払法人税等 ¥600',cr:'現金 ¥600',note:'中間納税。仮払法人税等（資産）として計上。CF 営業活動CF(-)。'};},
  settle_prepaid:function(s){if(s.prepaid_tax_pay<=0)return null;var a=s.prepaid_tax_pay;s.prepaid_tax_pay=0;s.tax_pay=Math.max(0,s.tax_pay-a);return{dr:'未払法人税等 ¥'+a,cr:'仮払法人税等 ¥'+a,note:'前払税金と未払税金の相殺精算。'};},
  deferred_tax_asset:function(s){s.deferred_tax_a+=400;s.deferred_tax_exp-=400;return{dr:'繰延税金資産 ¥400',cr:'法人税等調整額 ¥400',note:'将来減算一時差異。PL 法人税費用減少。回収可能性要判断。'};},
  deferred_tax_liability:function(s){s.deferred_tax_l+=300;s.deferred_tax_exp+=300;return{dr:'法人税等調整額 ¥300',cr:'繰延税金負債 ¥300',note:'将来加算一時差異。PL 法人税費用増加。'};},
  valuation_allowance:function(s){if(s.deferred_tax_a<200)return null;s.deferred_tax_a-=200;s.deferred_tax_exp+=200;return{dr:'法人税等調整額 ¥200',cr:'繰延税金資産（評価性引当） ¥200',note:'回収可能性なし → 評価性引当額計上。繰延税金資産の実質控除。'};},
  ifrs_lease_rou:function(s){s.rou_asset+=3000;s.lease_liability+=3000;return{dr:'使用権資産(ROU) ¥3,000',cr:'リース負債 ¥3,000',note:'IFRS16：オペレーティングリースのオンバランス化（BS 計上）。'};},
  ifrs_lease_payment:function(s){if(s.lease_liability<=0)return null;var a=Math.min(s.lease_liability,500);var p=Math.round(a*0.7),i=Math.round(a*0.3);s.cash-=a;s.lease_liability-=p;s.rou_asset-=p;s.interest_exp+=i;s.cf_fin-=a;return{dr:'リース負債 ¥'+p+' / 支払利息 ¥'+i,cr:'現金 ¥'+a,note:'リース料支払。元本部分と利息部分に分解。CF 財務活動CF(-)。'};},
  ifrs_revaluation:function(s){if(s.building===0)return null;s.building+=1000;s.oci+=1000;return{dr:'建物 ¥1,000',cr:'再評価剰余金(OCI) ¥1,000',note:'IFRS 再評価モデル。公正価値上昇分を OCI 計上。'};},
  hedge_instrument:function(s){s.oc_asset+=200;s.oci+=200;return{dr:'ヘッジ手段（デリバティブ） ¥200',cr:'その他包括利益(OCI) ¥200',note:'ヘッジ会計：有効部分の時価変動を OCI に繰延。IFRS9 準拠。'};},
  close_period:function(s){
    var cv=C(s);
    s.retained+=cv.ni;
    s.sales=0;s.purchase=0;s.begin_inv=0;s.cogs_adj=0;
    s.salary_exp=0;s.ad_exp=0;s.rd_exp=0;s.dep_exp=0;s.bad_debt_exp=0;
    s.retire_exp=0;s.prepaid_exp_used=0;s.warranty_exp=0;s.restr_exp=0;s.other_opex=0;
    s.interest_exp=0;s.fx_loss_amt=0;s.equity_loss=0;s.impairment_exp=0;
    s.goodwill_amort=0;s.inv_val_loss=0;s.sell_loss_amt=0;s.other_nonop_exp=0;
    s.interest_inc=0;s.dividend_inc=0;s.fx_gain_amt=0;s.equity_inc=0;
    s.inv_val_gain=0;s.sell_gain_amt=0;s.other_nonop_inc=0;
    s.tax_exp=0;s.deferred_tax_exp=0;
    s.cf_ops=0;s.cf_inv=0;s.cf_fin=0;
    s.prev_ar=s.ar;s.prev_inv=s.inventory;
    s.prev_ap=s.ap;s.prev_accrued=s.accrued_exp;s.prev_prepaid=s.prepaid;
    var oldP=s.period;s.period++;
    return{dr:'損益勘定（各収益・費用）',cr:'繰越利益剰余金',note:'第'+oldP+'期締め。純利益'+fmt(cv.ni)+'を繰越利益剰余金に振替。第'+s.period+'期開始。'};
  }
};

// =====================================================
// RENDER BS
// =====================================================
function rBS(s,cv){
  function R(lbl,val,cls,ind){return'<tr class="'+(cls||'')+'"><td class="'+(ind?'indent1':'')+'">'
    +lbl+'</td><td class="'+vc(val)+'">'+fmt(val)+'</td></tr>';}
  function G(lbl){return'<tr class="row-group"><td colspan="2">'+lbl+'</td></tr>';}
  var h='<table class="stmt-tbl">';
  h+=G('【資産の部】');
  h+=R('流動資産','','row-subtotal');
  h+=R('現金・預金',s.cash,'',true);
  h+=R('売掛金（AR）',s.ar,'',true);
  if(s.notes_rec>0)h+=R('受取手形',s.notes_rec,'',true);
  h+=R('繰越商品（在庫）',s.inventory,'',true);
  if(s.bad_debt_allow>0)h+=R('貸倒引当金（△）',-s.bad_debt_allow,'',true);
  if(s.prepaid>0)h+=R('前払費用',s.prepaid,'',true);
  if(s.advance_paid>0)h+=R('仮払金',s.advance_paid,'',true);
  if(s.accrued_int>0)h+=R('未収利息',s.accrued_int,'',true);
  if(s.short_loan_out>0)h+=R('短期貸付金',s.short_loan_out,'',true);
  if(s.prepaid_tax_pay>0)h+=R('仮払法人税等',s.prepaid_tax_pay,'',true);
  h+=R('流動資産 合計',cv.totCA,'row-subtotal');
  h+=R('固定資産','','row-subtotal');
  if(s.equipment>0)h+=R('機械設備（正味）',s.equipment-s.acc_dep_eq,'',true);
  if(s.building>0)h+=R('建物（正味）',s.building-s.acc_dep_bld,'',true);
  if(s.land>0)h+=R('土地',s.land,'',true);
  if(s.goodwill>0)h+=R('のれん',s.goodwill,'',true);
  if(s.investment>0)h+=R('投資有価証券',s.investment,'',true);
  if(s.deposit>0)h+=R('敷金・保証金',s.deposit,'',true);
  if(s.deferred_tax_a>0)h+=R('繰延税金資産',s.deferred_tax_a,'',true);
  if(s.rou_asset>0)h+=R('使用権資産（ROU）',s.rou_asset,'',true);
  if(s.oc_asset>0)h+=R('新株予約権等',s.oc_asset,'',true);
  h+=R('固定資産 合計',cv.totFA,'row-subtotal');
  h+=R('資 産 合 計',cv.totA,'row-total');
  h+=G('【負債の部】');
  h+=R('流動負債','','row-subtotal');
  if(s.ap>0)h+=R('買掛金（AP）',s.ap,'',true);
  if(s.advance_rec>0)h+=R('前受金',s.advance_rec,'',true);
  if(s.accrued_exp>0)h+=R('未払費用',s.accrued_exp,'',true);
  if(s.short_loan>0)h+=R('短期借入金',s.short_loan,'',true);
  if(s.tax_pay>0)h+=R('未払法人税等',s.tax_pay,'',true);
  if(s.warranty_prov>0)h+=R('製品保証引当金',s.warranty_prov,'',true);
  if(s.restr_prov>0)h+=R('リストラ引当金',s.restr_prov,'',true);
  h+=R('流動負債 合計',cv.totCL,'row-subtotal');
  h+=R('固定負債','','row-subtotal');
  if(s.long_loan>0)h+=R('長期借入金',s.long_loan,'',true);
  if(s.bond>0)h+=R('社債',s.bond,'',true);
  if(s.lease_liability>0)h+=R('リース負債',s.lease_liability,'',true);
  if(s.retire_allow>0)h+=R('退職給付引当金',s.retire_allow,'',true);
  if(s.deferred_tax_l>0)h+=R('繰延税金負債',s.deferred_tax_l,'',true);
  h+=R('固定負債 合計',cv.totLL,'row-subtotal');
  h+=R('負 債 合 計',cv.totL,'row-total');
  h+=G('【純資産の部】');
  h+=R('資本金',s.capital,'',true);
  if(s.capital_reserve>0)h+=R('資本準備金',s.capital_reserve,'',true);
  if(s.treasury_stock>0)h+=R('自己株式（△）',-s.treasury_stock,'',true);
  h+=R('繰越利益剰余金',s.retained+cv.ni,'',true);
  if(s.oci!==0)h+=R('その他包括利益累計額（OCI）',s.oci,'',true);
  if(s.minority>0)h+=R('非支配株主持分',s.minority,'',true);
  h+=R('純 資 産 合 計',cv.totEq,'row-total');
  h+='</table>';
  document.getElementById('bs-body').innerHTML=h;
}

// =====================================================
// RENDER PL
// =====================================================
function rPL(s,cv){
  function R(lbl,val,cls,ind){return'<tr class="'+(cls||'')+'"><td class="'+(ind?'indent1':'')+'">'
    +lbl+'</td><td class="'+vc(val)+'">'+fmt(val)+'</td></tr>';}
  function G(lbl){return'<tr class="row-group"><td colspan="2">'+lbl+'</td></tr>';}
  var h='<table class="stmt-tbl">';
  h+=G('【売上・売上原価】');
  h+=R('売上高（売上収益）',s.sales,'',true);
  h+=R('売上原価',cv.cogs,'',true);
  h+=R('売上総利益（粗利）',cv.grossP,'row-subtotal');
  h+=G('【販売費及び一般管理費】');
  if(s.salary_exp>0)h+=R('人件費（給与）',s.salary_exp,'',true);
  if(s.ad_exp>0)h+=R('広告宣伝費',s.ad_exp,'',true);
  if(s.rd_exp>0)h+=R('研究開発費',s.rd_exp,'',true);
  if(s.dep_exp>0)h+=R('減価償却費',s.dep_exp,'',true);
  if(s.bad_debt_exp>0)h+=R('貸倒引当金繰入',s.bad_debt_exp,'',true);
  if(s.retire_exp>0)h+=R('退職給付費用',s.retire_exp,'',true);
  if(s.prepaid_exp_used>0)h+=R('前払費用振替',s.prepaid_exp_used,'',true);
  if(s.warranty_exp>0)h+=R('製品保証費用',s.warranty_exp,'',true);
  if(s.restr_exp>0)h+=R('リストラ費用',s.restr_exp,'',true);
  if(s.other_opex>0)h+=R('その他販管費',s.other_opex,'',true);
  h+=R('販管費 合計',cv.opex,'row-subtotal');
  h+=R('営 業 利 益',cv.ebit,'row-total');
  h+=G('【営業外損益】');
  if(s.interest_inc>0)h+=R('受取利息',s.interest_inc,'',true);
  if(s.dividend_inc>0)h+=R('受取配当金',s.dividend_inc,'',true);
  if(s.fx_gain_amt>0)h+=R('為替差益',s.fx_gain_amt,'',true);
  if(s.equity_inc>0)h+=R('持分法投資利益',s.equity_inc,'',true);
  if(s.inv_val_gain>0)h+=R('有価証券評価益',s.inv_val_gain,'',true);
  if(s.sell_gain_amt>0)h+=R('固定資産・投資売却益',s.sell_gain_amt,'',true);
  if(s.other_nonop_inc>0)h+=R('その他営業外収益',s.other_nonop_inc,'',true);
  if(s.interest_exp>0)h+=R('支払利息',s.interest_exp,'',true);
  if(s.fx_loss_amt>0)h+=R('為替差損',s.fx_loss_amt,'',true);
  if(s.equity_loss>0)h+=R('持分法投資損失',s.equity_loss,'',true);
  if(s.inv_val_loss>0)h+=R('有価証券評価損',s.inv_val_loss,'',true);
  if(s.impairment_exp>0)h+=R('減損損失',s.impairment_exp,'',true);
  if(s.goodwill_amort>0)h+=R('のれん償却',s.goodwill_amort,'',true);
  if(s.sell_loss_amt>0)h+=R('固定資産・投資売却損',s.sell_loss_amt,'',true);
  if(s.other_nonop_exp>0)h+=R('その他営業外費用',s.other_nonop_exp,'',true);
  h+=R('経 常 利 益（税引前）',cv.ebt,'row-total');
  h+=G('【税金】');
  if(s.tax_exp>0)h+=R('法人税等',s.tax_exp,'',true);
  if(s.deferred_tax_exp!==0)h+=R('法人税等調整額',s.deferred_tax_exp,'',true);
  h+=R('当 期 純 利 益',cv.ni,'row-total');
  h+='</table>';
  document.getElementById('pl-body').innerHTML=h;
}

// =====================================================
// RENDER CF (間接法)
// =====================================================
function rCF(s,cv){
  function R(lbl,val,cls,ind){return'<tr class="'+(cls||'')+'"><td class="'+(ind?'indent1':'')+'">'
    +lbl+'</td><td class="'+vc(val)+'">'+fmt(val)+'</td></tr>';}
  function G(lbl){return'<tr class="row-group"><td colspan="2">'+lbl+'</td></tr>';}
  var cfStart=s.cash-s.cf_ops-s.cf_inv-s.cf_fin;
  var h='<table class="stmt-tbl">';
  h+=G('【営業活動によるCF】');
  h+=R('当期純利益',cv.ni,'',true);
  h+=G('非現金項目の調整');
  if(s.dep_exp>0)h+=R('減価償却費（加算）',s.dep_exp,'',true);
  if(s.bad_debt_exp>0)h+=R('貸倒引当金繰入（加算）',s.bad_debt_exp,'',true);
  if(s.goodwill_amort>0)h+=R('のれん償却（加算）',s.goodwill_amort,'',true);
  if(s.impairment_exp>0)h+=R('減損損失（加算）',s.impairment_exp,'',true);
  if(s.retire_exp>0)h+=R('退職給付費用（加算）',s.retire_exp,'',true);
  h+=G('運転資本の増減');
  if(cv.dAR!==0)h+=R('売掛金（AR）増減',cv.dAR,'',true);
  if(cv.dINV!==0)h+=R('棚卸資産（INV）増減',cv.dINV,'',true);
  if(cv.dAP!==0)h+=R('買掛金（AP）増減',cv.dAP,'',true);
  if(cv.dAccrued!==0)h+=R('未払費用増減',cv.dAccrued,'',true);
  if(cv.dPrepaid!==0)h+=R('前払費用増減',cv.dPrepaid,'',true);
  h+=R('小計（税引前営業CF）',cv.cfOp_sub,'row-subtotal');
  if(s.tax_exp>0)h+=R('法人税等支払',-s.tax_exp,'',true);
  if(s.tax_pay>0)h+=R('（未払法人税残存）',s.tax_pay,'',true);
  h+=R('営業活動CF 合計',cv.cfOp,'row-total');
  h+=G('【投資活動によるCF】');
  if(s.cf_inv<0)h+=R('固定資産・投資等の取得',s.cf_inv,'',true);
  if(s.cf_inv>0)h+=R('固定資産・投資等の売却',s.cf_inv,'',true);
  if(s.cf_inv===0)h+=R('（取引なし）',0,'',true);
  h+=R('投資活動CF 合計',s.cf_inv,'row-total');
  h+=G('【財務活動によるCF】');
  if(s.cf_fin>0)h+=R('借入・社債・増資等',s.cf_fin,'',true);
  if(s.cf_fin<0)h+=R('返済・配当・自己株式等',s.cf_fin,'',true);
  if(s.cf_fin===0)h+=R('（取引なし）',0,'',true);
  h+=R('財務活動CF 合計',s.cf_fin,'row-total');
  h+=G('【現金残高】');
  h+=R('期首現金残高',cfStart,'',true);
  h+=R('当期CF増減計',s.cf_ops+s.cf_inv+s.cf_fin,'',true);
  h+=R('期末現金残高',s.cash,'row-total');
  h+='</table>';
  document.getElementById('cf-body').innerHTML=h;
}

// =====================================================
// UPDATE WC
// =====================================================
function updateWC(s,cv){
  function fmtWC(v){return v===0?'¥0':fmt(v);}
  document.getElementById('wc-ar').textContent=fmtWC(s.ar);
  document.getElementById('wc-inv').textContent=fmtWC(s.inventory);
  document.getElementById('wc-ap').textContent=fmtWC(s.ap);
  var tDSO=+document.getElementById('tgt-dso').value||30;
  var tDPO=+document.getElementById('tgt-dpo').value||45;
  var tDIO=+document.getElementById('tgt-dio').value||60;
  function setM(id,val,tgt,lowerIsBetter){
    var el=document.getElementById(id);
    if(val<=0){el.textContent='—';el.className='wc-m-val';return;}
    el.textContent=val.toFixed(1)+'日';
    var bad=lowerIsBetter?(val>tgt):(val<tgt);
    el.className='wc-m-val '+(bad?'warn':'ok');
  }
  setM('wc-dso',cv.dso,tDSO,true);
  setM('wc-dpo',cv.dpo,tDPO,false);
  setM('wc-dio',cv.dio,tDIO,true);
  var cccEl=document.getElementById('wc-ccc');
  if(cv.ccc===0&&s.ar===0&&s.ap===0&&s.inventory===0){cccEl.textContent='—';cccEl.className='wc-m-val';}
  else{cccEl.textContent=cv.ccc.toFixed(1)+'日';cccEl.className='wc-m-val '+(cv.ccc<0?'ok':'warn');}
}

// =====================================================
// RENDER ALL
// =====================================================
function renderAll(){
  var cv=C(S);
  rBS(S,cv);rPL(S,cv);rCF(S,cv);updateWC(S,cv);
  document.getElementById('kpi-ta').textContent=fmt(cv.totA);
  document.getElementById('kpi-rev').textContent=fmt(S.sales);
  var niEl=document.getElementById('kpi-ni');
  niEl.textContent=fmt(cv.ni);
  niEl.className='kpi-val'+(cv.ni>0?' pos':cv.ni<0?' neg':'');
  document.getElementById('kpi-cash').textContent=fmt(S.cash);
  var er=cv.totA>0?(cv.totEq/cv.totA*100):100;
  var erEl=document.getElementById('kpi-er');
  erEl.textContent=er.toFixed(1)+'%';
  erEl.className='kpi-val'+(er>=50?' pos':er<0?' neg':'');
  document.getElementById('kpi-re').textContent=fmt(S.retained+cv.ni);
  document.getElementById('period-chip').textContent='第'+S.period+'期';
  var diff=Math.abs(cv.totA-(cv.totL+cv.totEq));
  var eqEl=document.getElementById('eq-status');
  var fmEl=document.getElementById('eq-formula');
  if(diff<1){eqEl.textContent='BS 均衡';eqEl.className='eq-ok';}
  else{eqEl.textContent='BS 不均衡  Δ¥'+Math.round(diff);eqEl.className='eq-ng';}
  fmEl.textContent='資産 '+fmt(cv.totA)+' ＝ 負債 '+fmt(cv.totL)+' ＋ 純資産 '+fmt(cv.totEq);
  var ep=cv.totA>0?Math.max(0,Math.min(1,cv.totEq/cv.totA)):1;
  document.getElementById('eq-bar-fill').style.width=(ep*100)+'%';
  document.getElementById('eq-lbl-e').textContent='自己資本 '+fmt(cv.totEq)+' ('+pct(ep)+')';
  document.getElementById('eq-lbl-d').textContent='負債 '+fmt(cv.totL)+' ('+pct(Math.max(0,1-ep))+')';
  ['card-bs','card-pl','card-cf'].forEach(function(id){
    var el=document.getElementById(id);
    el.classList.remove('pulse');void el.offsetWidth;el.classList.add('pulse');
  });
}

// =====================================================
// GO
// =====================================================
function go(key){
  if(!T[key]){console.error('Unknown tx:',key);return;}
  var result=T[key](S);
  if(!result){
    document.getElementById('journal-entry').innerHTML='<span style="color:var(--text3)">（この取引を実行するための前提条件が満たされていません）</span>';
    document.getElementById('journal-note').textContent='';
    return;
  }
  txnCount++;
  document.getElementById('journal-entry').innerHTML=
    '<span class="dr">（借）'+result.dr+'</span>　<span class="cr">（貸）'+result.cr+'</span>';
  document.getElementById('journal-note').textContent=result.note;
  renderAll();
  var color=LV_COLORS[currentLv]||'#8fa2b4';
  var ll=document.getElementById('log-list');
  if(ll.textContent.indexOf('取引はここ')>=0)ll.innerHTML='';
  var d=document.createElement('div');d.className='log-card';
  d.innerHTML='<div class="log-dot" style="background:'+color+'"></div>'
    +'<span class="log-meta">Lv'+currentLv+' #'+txnCount+'</span>'
    +'<span class="log-txt">'+result.dr+' ／ '+result.cr+'</span>';
  ll.insertBefore(d,ll.firstChild);
}

// =====================================================
// LEVEL
// =====================================================
var LV_META=[null,
  {name:'Lv.1  入門',     desc:'現金の動き・借方貸方・利益のしくみを体感しましょう。',    color:'#3e7068'},
  {name:'Lv.2  初級',     desc:'掛売買・前払・前受・未払など発生主義会計の基礎。',         color:'#357062'},
  {name:'Lv.3  中級',     desc:'固定資産・減価償却・借入金など BS の複雑な構造を理解。',   color:'#2c5a55'},
  {name:'Lv.4  準上級',   desc:'社債・増資・自己株式・投資有価証券など財務取引の全体像。', color:'#2a4a7c'},
  {name:'Lv.5  上級',     desc:'のれん・減損・税効果・為替・棚卸評価など高度な会計処理。', color:'#243f6b'},
  {name:'Lv.6  超上級',   desc:'Lv1〜5 全科目統合。複合取引と連鎖する財務三表の動きを確認。', color:'#1e345a'},
  {name:'Lv.7  エキスパート', desc:'為替・税効果・M&A・引当金の高度な論点を習得。',         color:'#1a2d4e'},
  {name:'Lv.8  プロ',     desc:'収益認識・リース・金融商品・連結会計のプロレベル処理。',   color:'#7a5230'},
  {name:'Lv.9  マスター', desc:'IFRS・持分法・非支配株主・ストックオプションなど国際水準。', color:'#5a3a22'},
  {name:'Lv.10 総復習',   desc:'Lv1〜9 の全勘定科目・全取引を網羅。財務三表の完全制覇。',  color:'#1a1e2e'}
];

var LV_COLORS=['',
  '#3e7068','#357062','#2c5a55',
  '#2a4a7c','#243f6b','#1e345a',
  '#1a2d4e','#7a5230','#5a3a22','#1a1e2e'
];

function switchLevel(lv){
  lv=parseInt(lv);currentLv=lv;
  document.querySelectorAll('.lv-panel').forEach(function(p){p.classList.remove('active');});
  var target=document.getElementById('panel-'+lv);
  if(target)target.classList.add('active');
  var meta=LV_META[lv];
  var bar=document.getElementById('lv-info-bar');
  if(meta){bar.style.background=meta.color;bar.textContent=meta.name+'  —  '+meta.desc;}
  document.getElementById('lv-select').value=lv;
}

function resetAll(){
  if(!confirm('全データをリセットしますか？'))return;
  S=MK();txnCount=0;
  document.getElementById('journal-entry').textContent='（取引ボタンを押すと仕訳が表示されます）';
  document.getElementById('journal-note').textContent='';
  document.getElementById('log-list').innerHTML='（取引はここに記録されます）';
  renderAll();
}
function clearLog(){document.getElementById('log-list').innerHTML='（ログを消去しました）';}

// =====================================================
// BUILD PANELS
// =====================================================
function buildPanels(){
  var container=document.getElementById('panels-container');

  // icon: Lucide icon name for each section category
  var PANELS={
    1:[
      {title:'売上・収益',icon:'trending-up',btns:[
        ['cash_sales','現金売上','¥5,000']
      ]},
      {title:'仕入・費用',icon:'receipt',btns:[
        ['cash_purchase','現金仕入','¥2,000'],
        ['pay_salary','給与支払','¥1,500'],
        ['ad_expense','広告宣伝費','¥500']
      ]},
      // ① 仮払・立替 を「売掛金のしくみ」に変更（入門者向け）
      {title:'売掛金のしくみ（掛取引）',icon:'file-text',btns:[
        ['credit_sales','掛売上（売掛金計上）','¥3,000'],
        ['collect_ar','売掛金 回収','']
      ]},
      {title:'決算整理',icon:'calendar-check',btns:[
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500'],
        ['close_period','期末決算締め','']
      ]}
    ],
    2:[
      {title:'売上・収益',icon:'trending-up',btns:[
        ['cash_sales','現金売上','¥5,000'],
        ['credit_sales','掛売上','¥3,000'],
        ['collect_ar','売掛金 回収',''],
        ['receive_advance','前受金 受取','¥2,000'],
        ['advance_to_sales','前受金 → 売上振替','']
      ]},
      {title:'仕入・費用',icon:'receipt',btns:[
        ['cash_purchase','現金仕入','¥2,000'],
        ['credit_purchase','掛仕入','¥1,500'],
        ['pay_ap','買掛金 支払',''],
        ['pay_salary','給与支払','¥1,500'],
        ['ad_expense','広告宣伝費','¥500'],
        ['prepaid_expense','前払費用 計上','¥600'],
        ['expense_prepaid','前払費用 → 費用振替',''],
        ['accrue_salary','未払費用 計上','¥800'],
        ['pay_accrued','未払費用 支払','']
      ]},
      {title:'決算整理',icon:'calendar-check',btns:[
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500'],
        ['accrue_bad_debt','貸倒引当金 繰入','¥300'],
        ['bad_debt_writeoff','貸倒 実際発生',''],
        ['close_period','期末決算締め','']
      ]}
    ],
    3:[
      {title:'売上・収益',icon:'trending-up',btns:[
        ['cash_sales','現金売上','¥5,000'],
        ['credit_sales','掛売上','¥3,000'],
        ['collect_ar','売掛金 回収',''],
        ['interest_income','受取利息 計上','¥500'],
        ['collect_interest','受取利息 受取','']
      ]},
      {title:'仕入・費用',icon:'receipt',btns:[
        ['cash_purchase','現金仕入','¥2,000'],
        ['credit_purchase','掛仕入','¥1,500'],
        ['pay_salary','給与支払','¥1,500'],
        ['pay_interest','支払利息','¥200']
      ]},
      {title:'固定資産',icon:'building-2',btns:[
        ['buy_equipment','設備購入','¥3,000'],
        ['buy_building','建物購入','¥5,000'],
        ['buy_land','土地購入','¥4,000'],
        ['sell_asset','固定資産売却（益）',''],
        ['sell_asset_loss','固定資産売却（損）',''],
        ['depreciation','減価償却費','']
      ]},
      {title:'借入・返済',icon:'credit-card',btns:[
        ['borrow_short','短期借入','¥3,000'],
        ['repay_short','短期返済',''],
        ['borrow_long','長期借入','¥5,000'],
        ['repay_long','長期返済','']
      ]},
      {title:'決算整理',icon:'calendar-check',btns:[
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500'],
        ['accrue_bad_debt','貸倒引当金 繰入','¥300'],
        ['accrue_salary','未払費用 計上','¥800'],
        ['prepaid_expense','前払費用 計上','¥600'],
        ['accrue_tax','法人税等 計上','¥1,200'],
        ['close_period','期末決算締め','']
      ]}
    ],
    4:[
      {title:'売上・収益',icon:'trending-up',btns:[
        ['cash_sales','現金売上','¥5,000'],
        ['credit_sales','掛売上','¥3,000'],
        ['collect_ar','売掛金 回収',''],
        ['interest_income','受取利息','¥500'],
        ['dividend_income','受取配当金','¥800']
      ]},
      {title:'仕入・費用',icon:'receipt',btns:[
        ['cash_purchase','現金仕入','¥2,000'],
        ['credit_purchase','掛仕入','¥1,500'],
        ['pay_salary','給与支払','¥1,500'],
        ['rd_expense','研究開発費','¥1,000'],
        ['pay_interest','支払利息','¥200']
      ]},
      {title:'固定資産・投資',icon:'building-2',btns:[
        ['buy_equipment','設備購入','¥3,000'],
        ['depreciation','減価償却費',''],
        ['buy_investment','投資有価証券 取得','¥2,000'],
        ['sell_investment','投資有価証券 売却',''],
        ['invest_valuation_up','有価証券評価益（OCI）','¥500'],
        ['invest_valuation_dn','有価証券評価損',''],
        ['pay_deposit','敷金・保証金 支払','¥1,000']
      ]},
      {title:'財務・資本',icon:'landmark',btns:[
        ['issue_bond','社債発行','¥5,000'],
        ['redeem_bond','社債償還',''],
        ['issue_stock','増資（株式発行）','¥3,000'],
        ['buy_treasury','自己株式 取得','¥1,000'],
        ['cancel_treasury','自己株式 消却',''],
        ['pay_dividend','配当支払','¥500'],
        ['borrow_short','短期借入','¥3,000'],
        ['borrow_long','長期借入','¥5,000']
      ]},
      {title:'決算整理',icon:'calendar-check',btns:[
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500'],
        ['accrue_bad_debt','貸倒引当金 繰入','¥300'],
        ['depreciation','減価償却',''],
        ['accrue_retirement','退職給付引当金','¥1,000'],
        ['accrue_tax','法人税等 計上','¥1,200'],
        ['close_period','期末決算締め','']
      ]}
    ],
    5:[
      {title:'売上・収益',icon:'trending-up',btns:[
        ['cash_sales','現金売上','¥5,000'],
        ['credit_sales','掛売上','¥3,000'],
        ['collect_ar','売掛金 回収',''],
        ['fx_gain','為替差益','¥600']
      ]},
      {title:'仕入・費用',icon:'receipt',btns:[
        ['cash_purchase','現金仕入','¥2,000'],
        ['credit_purchase','掛仕入','¥1,500'],
        ['pay_salary','給与支払','¥1,500'],
        ['fx_loss','為替差損','¥400']
      ]},
      {title:'棚卸・評価',icon:'package',btns:[
        ['inventory_loss','棚卸減耗損',''],
        ['inventory_writedown','商品評価損（低価法）',''],
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500']
      ]},
      {title:'固定資産',icon:'building-2',btns:[
        ['buy_equipment','設備購入','¥3,000'],
        ['depreciation','減価償却費',''],
        ['impairment','減損損失','']
      ]},
      {title:'決算整理',icon:'calendar-check',btns:[
        ['accrue_bad_debt','貸倒引当金 繰入','¥300'],
        ['accrue_retirement','退職給付引当金','¥1,000'],
        ['accrue_tax','法人税等 計上','¥1,200'],
        ['pay_tax','法人税等 支払',''],
        ['close_period','期末決算締め','']
      ]}
    ],
    6:[
      {title:'売上・収益',icon:'trending-up',btns:[
        ['cash_sales','現金売上','¥5,000'],
        ['credit_sales','掛売上','¥3,000'],
        ['collect_ar','売掛金 回収',''],
        ['interest_income','受取利息','¥500'],
        ['dividend_income','受取配当金','¥800'],
        ['fx_gain','為替差益','¥600']
      ]},
      {title:'費用',icon:'receipt',btns:[
        ['cash_purchase','現金仕入','¥2,000'],
        ['credit_purchase','掛仕入','¥1,500'],
        ['pay_salary','給与支払','¥1,500'],
        ['ad_expense','広告宣伝費','¥500'],
        ['rd_expense','研究開発費','¥1,000'],
        ['pay_interest','支払利息','¥200'],
        ['fx_loss','為替差損','¥400']
      ]},
      {title:'固定資産・のれん',icon:'building-2',btns:[
        ['buy_equipment','設備購入','¥3,000'],
        ['buy_building','建物購入','¥5,000'],
        ['buy_land','土地購入','¥4,000'],
        ['sell_asset','固定資産売却（益）',''],
        ['sell_asset_loss','固定資産売却（損）',''],
        ['depreciation','減価償却費',''],
        ['impairment','減損損失',''],
        ['buy_goodwill','のれん 取得','¥4,000'],
        ['amortize_goodwill','のれん 償却','']
      ]},
      {title:'財務・資本',icon:'landmark',btns:[
        ['borrow_short','短期借入','¥3,000'],
        ['repay_short','短期返済',''],
        ['borrow_long','長期借入','¥5,000'],
        ['repay_long','長期返済',''],
        ['issue_bond','社債発行','¥5,000'],
        ['redeem_bond','社債償還',''],
        ['issue_stock','増資','¥3,000'],
        ['buy_treasury','自己株式 取得','¥1,000'],
        ['pay_dividend','配当支払','¥500']
      ]},
      {title:'決算整理（全）',icon:'calendar-check',btns:[
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500'],
        ['accrue_bad_debt','貸倒引当金 繰入','¥300'],
        ['bad_debt_writeoff','貸倒 実際発生',''],
        ['accrue_salary','未払費用 計上','¥800'],
        ['accrue_retirement','退職給付引当金','¥1,000'],
        ['inventory_loss','棚卸減耗損',''],
        ['inventory_writedown','商品評価損',''],
        ['accrue_tax','法人税等 計上','¥1,200'],
        ['pay_tax','法人税等 支払',''],
        ['close_period','期末決算締め','']
      ]}
    ],
    7:[
      {title:'為替・外貨',icon:'globe',btns:[
        ['fx_gain','為替差益','¥600'],
        ['fx_loss','為替差損','¥400'],
        ['fx_translation_adj','換算調整勘定（OCI）','¥300'],
        ['forward_contract_gain','先物為替予約 差益','¥800'],
        ['forward_contract_loss','先物為替予約 差損','¥600']
      ]},
      {title:'税効果・繰延',icon:'percent',btns:[
        ['deferred_tax_asset','繰延税金資産 計上','¥400'],
        ['deferred_tax_liability','繰延税金負債 計上','¥300'],
        ['prepaid_tax','法人税等前払（中間）','¥600'],
        ['settle_prepaid','前払 精算',''],
        ['accrue_tax','法人税等 計上','¥1,200']
      ]},
      {title:'棚卸・評価',icon:'package',btns:[
        ['cash_purchase','現金仕入','¥2,000'],
        ['credit_purchase','掛仕入','¥1,500'],
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500'],
        ['inventory_loss','棚卸減耗損',''],
        ['inventory_writedown','商品評価損','']
      ]},
      {title:'資産評価・減損',icon:'layers',btns:[
        ['buy_equipment','設備購入','¥3,000'],
        ['depreciation','減価償却費',''],
        ['impairment','減損損失',''],
        ['buy_goodwill','のれん 取得','¥4,000'],
        ['amortize_goodwill','のれん 償却',''],
        ['invest_valuation_up','有価証券評価益（OCI）','¥500'],
        ['invest_valuation_dn','有価証券評価損','']
      ]},
      {title:'資本・財務',icon:'landmark',btns:[
        ['cash_sales','現金売上','¥5,000'],
        ['credit_sales','掛売上','¥3,000'],
        ['pay_salary','給与支払','¥1,500'],
        ['issue_stock','増資','¥3,000'],
        ['buy_treasury','自己株式 取得','¥1,000'],
        ['cancel_treasury','自己株式 消却',''],
        ['pay_dividend','配当支払','¥500'],
        ['issue_bond','社債発行','¥5,000'],
        ['redeem_bond','社債償還','']
      ]},
      {title:'決算整理',icon:'calendar-check',btns:[
        ['accrue_bad_debt','貸倒引当金 繰入','¥300'],
        ['accrue_retirement','退職給付引当金','¥1,000'],
        ['accrue_salary','未払費用 計上','¥800'],
        ['pay_tax','法人税等 支払',''],
        ['close_period','期末決算締め','']
      ]}
    ],
    8:[
      {title:'高度収益認識',icon:'trending-up',btns:[
        ['cash_sales','現金売上','¥5,000'],
        ['credit_sales','掛売上（IFRS15）','¥3,000'],
        ['collect_ar','売掛金 回収',''],
        ['receive_advance','前受金（長期契約）','¥2,000'],
        ['advance_to_sales','前受金 → 売上振替',''],
        ['interest_income','受取利息','¥500'],
        ['dividend_income','受取配当金','¥800'],
        ['fx_gain','為替差益','¥600']
      ]},
      {title:'引当金・準備金',icon:'shield',btns:[
        ['accrue_bad_debt','貸倒引当金 繰入','¥300'],
        ['bad_debt_writeoff','貸倒 実際発生',''],
        ['accrue_retirement','退職給付引当金','¥1,000'],
        ['pay_retirement','退職給付 支払',''],
        ['warranty_provision','製品保証引当金','¥500'],
        ['restructuring_provision','リストラ引当金','¥2,000']
      ]},
      {title:'M&A・連結',icon:'git-merge',btns:[
        ['buy_goodwill','のれん 取得（M&A）','¥4,000'],
        ['amortize_goodwill','のれん 償却',''],
        ['impairment','のれん 減損',''],
        ['buy_investment','子会社・関連会社株式 取得','¥2,000'],
        ['sell_investment','投資有価証券 売却',''],
        ['equity_method_income','持分法投資利益','¥1,000'],
        ['equity_method_loss','持分法投資損失','']
      ]},
      {title:'リース・金融商品',icon:'home',btns:[
        ['ifrs_lease_rou','使用権資産 計上（IFRS16）','¥3,000'],
        ['ifrs_lease_payment','リース負債 支払',''],
        ['hedge_instrument','ヘッジ手段 指定（OCI）','¥200'],
        ['fx_translation_adj','換算調整勘定','¥300']
      ]},
      {title:'税効果・繰延',icon:'percent',btns:[
        ['deferred_tax_asset','繰延税金資産','¥400'],
        ['deferred_tax_liability','繰延税金負債','¥300'],
        ['accrue_tax','法人税等 計上','¥1,200'],
        ['pay_tax','法人税等 支払','']
      ]},
      {title:'資本政策',icon:'landmark',btns:[
        ['issue_stock','増資（第三者割当）','¥3,000'],
        ['buy_treasury','自己株式 取得','¥1,000'],
        ['cancel_treasury','自己株式 消却',''],
        ['pay_dividend','配当支払','¥500'],
        ['issue_bond','社債発行','¥5,000'],
        ['redeem_bond','社債償還','']
      ]},
      {title:'決算整理',icon:'calendar-check',btns:[
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500'],
        ['inventory_loss','棚卸減耗損',''],
        ['inventory_writedown','商品評価損',''],
        ['depreciation','減価償却',''],
        ['accrue_salary','未払費用 計上','¥800'],
        ['prepaid_expense','前払費用 計上','¥600'],
        ['close_period','期末決算締め','']
      ]}
    ],
    9:[
      {title:'国際会計（IFRS）',icon:'globe',btns:[
        ['cash_sales','現金売上（IFRS 5段階）','¥5,000'],
        ['credit_sales','掛売上','¥3,000'],
        ['ifrs_lease_rou','使用権資産 計上（IFRS16）','¥3,000'],
        ['ifrs_lease_payment','リース負債 支払',''],
        ['ifrs_revaluation','有形固定資産 再評価','¥1,000'],
        ['fx_translation_adj','換算調整勘定','¥300'],
        ['forward_contract_gain','先物差益','¥800'],
        ['forward_contract_loss','先物差損','¥600']
      ]},
      {title:'高度税効果',icon:'percent',btns:[
        ['deferred_tax_asset','繰延税金資産','¥400'],
        ['deferred_tax_liability','繰延税金負債','¥300'],
        ['valuation_allowance','評価性引当額（回収不能）',''],
        ['accrue_tax','法人税等 計上','¥1,200'],
        ['pay_tax','法人税等 支払','']
      ]},
      {title:'連結・持分法',icon:'git-merge',btns:[
        ['buy_goodwill','のれん（パーチェス法）','¥4,000'],
        ['impairment','のれん減損（IFRS）',''],
        ['equity_method_income','持分法投資利益','¥1,000'],
        ['equity_method_loss','持分法投資損失',''],
        ['minority_interest','非支配株主持分','¥1,000'],
        ['buy_investment','関連会社株式 取得','¥2,000']
      ]},
      {title:'複雑な資本取引',icon:'landmark',btns:[
        ['issue_stock','新株予約権付社債','¥3,000'],
        ['stock_option','ストックオプション 費用化','¥300'],
        ['buy_treasury','自己株式 取得','¥1,000'],
        ['cancel_treasury','自己株式 消却',''],
        ['pay_dividend','配当支払','¥500'],
        ['oci_item','その他包括利益（OCI）','¥500']
      ]},
      {title:'決算整理',icon:'calendar-check',btns:[
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500'],
        ['inventory_loss','棚卸減耗損',''],
        ['inventory_writedown','商品評価損',''],
        ['depreciation','減価償却',''],
        ['amortize_goodwill','のれん 償却',''],
        ['accrue_retirement','退職給付引当金','¥1,000'],
        ['warranty_provision','製品保証引当金','¥500'],
        ['accrue_salary','未払費用 計上','¥800'],
        ['accrue_bad_debt','貸倒引当金 繰入','¥300'],
        ['close_period','期末決算締め','']
      ]}
    ],
    10:[
      {title:'売上・収益【全】',icon:'trending-up',btns:[
        ['cash_sales','現金売上','¥5,000'],
        ['credit_sales','掛売上','¥3,000'],
        ['collect_ar','売掛金 回収',''],
        ['receive_advance','前受金 受取','¥2,000'],
        ['advance_to_sales','前受金 → 売上',''],
        ['interest_income','受取利息','¥500'],
        ['collect_interest','受取利息 受取',''],
        ['dividend_income','受取配当金','¥800'],
        ['fx_gain','為替差益','¥600'],
        ['equity_method_income','持分法投資利益','¥1,000']
      ]},
      {title:'仕入・費用【全】',icon:'receipt',btns:[
        ['cash_purchase','現金仕入','¥2,000'],
        ['credit_purchase','掛仕入','¥1,500'],
        ['pay_ap','買掛金 支払',''],
        ['pay_salary','給与支払','¥1,500'],
        ['accrue_salary','未払費用 計上','¥800'],
        ['pay_accrued','未払費用 支払',''],
        ['ad_expense','広告宣伝費','¥500'],
        ['rd_expense','研究開発費','¥1,000'],
        ['pay_interest','支払利息','¥200'],
        ['fx_loss','為替差損','¥400'],
        ['equity_method_loss','持分法投資損失',''],
        ['warranty_provision','製品保証引当金','¥500'],
        ['restructuring_provision','リストラ引当金','¥2,000']
      ]},
      {title:'前払・仮払',icon:'clock',btns:[
        ['prepay_advance','仮払金 支払','¥300'],
        ['settle_advance','仮払金 精算',''],
        ['prepaid_expense','前払費用 計上','¥600'],
        ['expense_prepaid','前払費用 → 費用振替','']
      ]},
      {title:'棚卸・評価【全】',icon:'package',btns:[
        ['closing_begin_inv','期首商品 → 仕入振替',''],
        ['closing_end_inv','期末商品 → 繰越商品','¥500'],
        ['inventory_loss','棚卸減耗損',''],
        ['inventory_writedown','商品評価損','']
      ]},
      {title:'固定資産【全】',icon:'building-2',btns:[
        ['buy_equipment','設備購入','¥3,000'],
        ['buy_building','建物購入','¥5,000'],
        ['buy_land','土地購入','¥4,000'],
        ['sell_asset','固定資産売却（益）',''],
        ['sell_asset_loss','固定資産売却（損）',''],
        ['depreciation','減価償却費',''],
        ['impairment','減損損失',''],
        ['buy_goodwill','のれん 取得','¥4,000'],
        ['amortize_goodwill','のれん 償却',''],
        ['pay_deposit','敷金・保証金 支払','¥1,000'],
        ['ifrs_lease_rou','使用権資産 計上','¥3,000'],
        ['ifrs_revaluation','固定資産再評価（IFRS）','¥1,000']
      ]},
      {title:'投資有価証券【全】',icon:'bar-chart-2',btns:[
        ['buy_investment','投資有価証券 取得','¥2,000'],
        ['sell_investment','投資有価証券 売却',''],
        ['invest_valuation_up','有価証券評価益（OCI）','¥500'],
        ['invest_valuation_dn','有価証券評価損','']
      ]},
      {title:'借入・社債【全】',icon:'credit-card',btns:[
        ['borrow_short','短期借入','¥3,000'],
        ['repay_short','短期返済',''],
        ['borrow_long','長期借入','¥5,000'],
        ['repay_long','長期返済',''],
        ['issue_bond','社債発行','¥5,000'],
        ['redeem_bond','社債償還',''],
        ['short_loan_out','短期貸付 実行','¥1,000'],
        ['collect_loan_out','短期貸付 回収','']
      ]},
      {title:'資本政策【全】',icon:'landmark',btns:[
        ['issue_stock','増資','¥3,000'],
        ['buy_treasury','自己株式 取得','¥1,000'],
        ['cancel_treasury','自己株式 消却',''],
        ['pay_dividend','配当支払','¥500'],
        ['stock_option','ストックオプション','¥300'],
        ['oci_item','その他包括利益（OCI）','¥500'],
        ['minority_interest','非支配株主持分','¥1,000']
      ]},
      {title:'高度・国際【全】',icon:'globe',btns:[
        ['fx_translation_adj','換算調整勘定','¥300'],
        ['forward_contract_gain','先物差益','¥800'],
        ['forward_contract_loss','先物差損','¥600'],
        ['deferred_tax_asset','繰延税金資産','¥400'],
        ['deferred_tax_liability','繰延税金負債','¥300'],
        ['valuation_allowance','評価性引当額',''],
        ['ifrs_lease_payment','リース負債 支払',''],
        ['hedge_instrument','ヘッジ手段 指定','¥200']
      ]},
      {title:'決算整理【全】',icon:'calendar-check',btns:[
        ['accrue_bad_debt','貸倒引当金 繰入','¥300'],
        ['bad_debt_writeoff','貸倒 実際発生',''],
        ['accrue_retirement','退職給付引当金','¥1,000'],
        ['pay_retirement','退職給付 支払',''],
        ['accrue_tax','法人税等 計上','¥1,200'],
        ['pay_tax','法人税等 支払',''],
        ['prepaid_tax','法人税等前払','¥600'],
        ['settle_prepaid','前払 精算',''],
        ['close_period','期末決算締め','']
      ]}
    ]
  };

  for(var lv=1;lv<=10;lv++){
    var panelDiv=document.createElement('div');
    panelDiv.className='lv-panel'+(lv===1?' active':'');
    panelDiv.id='panel-'+lv;
    var secs=PANELS[lv]||[];
    var html='';
    for(var i=0;i<secs.length;i++){
      var sec=secs[i];
      html+='<div class="btn-section">'
           +'<div class="btn-section-title">'
           +'<i data-lucide="'+(sec.icon||'circle')+'"></i>'
           +sec.title
           +'</div>';
      for(var j=0;j<sec.btns.length;j++){
        var b=sec.btns[j];
        html+='<button class="txn-btn" onclick="go(\''+b[0]+'\')">'
             +'<span>'+b[1]+'</span>'
             +(b[2]?'<span class="amt">'+b[2]+'</span>':'')
             +'</button>';
      }
      html+='</div>';
    }
    panelDiv.innerHTML=html;
    container.appendChild(panelDiv);
  }

  // Lucide アイコンを SVG に変換
  if(typeof lucide!=='undefined') lucide.createIcons();
}

// =====================================================
// INIT
// =====================================================
buildPanels();
switchLevel(1);
renderAll();
