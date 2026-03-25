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
var activeMobStmt='bs'; // mobile active statement tab
var assistMode=false;   // 補助モード
var pendingKey=null;    // 補助モード時の保留取引キー

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
  var balanced=diff<1;
  var eqEl=document.getElementById('eq-status');
  var fmEl=document.getElementById('eq-formula');
  if(balanced){eqEl.textContent='BS 均衡';eqEl.className='eq-ok';}
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

  // ── ROE / ROA ──
  var roeEl=document.getElementById('k-roe');
  var roaEl=document.getElementById('k-roa');
  if(cv.totEq>0&&cv.ni!==0){
    var roe=cv.ni/cv.totEq;
    roeEl.textContent=pct(roe);
    roeEl.className='kpi-val '+(roe>0?'pos':roe<0?'neg':'');
  }else{roeEl.textContent='—';roeEl.className='kpi-val';}
  if(cv.totA>0&&cv.ni!==0){
    var roa=cv.ni/cv.totA;
    roaEl.textContent=pct(roa);
    roaEl.className='kpi-val '+(roa>0?'pos':roa<0?'neg':'');
  }else{roaEl.textContent='—';roaEl.className='kpi-val';}

  // ── DuPont 3分解 ──
  var dpActive=S.sales>0&&cv.totEq>0&&cv.totA>0;
  function setDp(id,val,isRatio){
    var el=document.getElementById(id);
    if(!dpActive||!isFinite(val)){el.textContent='—';el.className='dp-val';return;}
    el.textContent=isRatio?pct(val):val.toFixed(2)+'x';
    el.className='dp-val '+(val>0?'val-pos':val<0?'val-neg':'val-zero');
  }
  var dpNpm=dpActive?cv.ni/S.sales:0;
  var dpTat=dpActive?S.sales/cv.totA:0;
  var dpLev=dpActive?cv.totA/cv.totEq:0;
  var dpRoe=dpActive?dpNpm*dpTat*dpLev:0;
  setDp('dp-npm',dpNpm,true);
  setDp('dp-tat',dpTat,false);
  setDp('dp-lev',dpLev,false);
  setDp('dp-roe',dpRoe,true);
}

// =====================================================
// MOBILE: Statement tabs (PC では使用しない・互換性のため残す)
// =====================================================
function switchStmt(which){}

// =====================================================
// GO
// =====================================================
function go(key){
  if(!T[key]){console.error('Unknown tx:',key);return;}

  // 補助モード ON → モーダルを表示してから実行
  if(assistMode){
    // 前提条件チェック（nullが返る場合は弾く）
    var test=T[key](MK_shadow());
    if(!test){
      setJournal('<span style="color:var(--text3)">（前提条件が満たされていません）</span>','');
      return;
    }
    pendingKey=key;
    openModal(key,test);
    return;
  }

  // 補助モード OFF → 従来通り即時実行
  execTransaction(key);
}

// 実際の取引実行（補助モード・通常モード共用）
function execTransaction(key){
  if(!T[key])return;
  var result=T[key](S);
  if(!result){
    setJournal('<span style="color:var(--text3)">（前提条件が満たされていません）</span>','');
    return;
  }
  txnCount++;
  var entry='<span class="dr">（借）'+result.dr+'</span>　<span class="cr">（貸）'+result.cr+'</span>';
  setJournal(entry,result.note);
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

// 補助モード用：現在のStateを壊さずにT[]の返値だけ得るためのシャドウ実行
function MK_shadow(){
  // Sのシャローコピー（T[]が参照するプロパティをすべて複製）
  var sh={};
  for(var k in S){if(Object.prototype.hasOwnProperty.call(S,k))sh[k]=S[k];}
  return sh;
}

function setJournal(entry,note){
  document.getElementById('journal-entry').innerHTML=entry;
  document.getElementById('journal-note').textContent=note;
}

// =====================================================
// ASSIST MODE — トグル
// =====================================================
function toggleAssistMode(){
  assistMode=!assistMode;
  var tog=document.getElementById('assist-toggle');
  var lbl=document.getElementById('assist-label');
  if(tog) tog.className='assist-toggle desk-only'+(assistMode?' on':'');
  if(lbl) lbl.textContent=assistMode?'補助モード ON':'補助モード OFF';
}

// =====================================================
// ASSIST MODE — モーダル
// =====================================================
function openModal(key,txResult){
  var ex=EXPLAIN[key];
  if(!ex){
    // EXPLAINデータがない場合はそのまま実行
    execTransaction(key);
    pendingKey=null;
    return;
  }

  // タイトル
  document.getElementById('mod-title').textContent=ex.title;

  // Block1: 仕訳（T[]の返値から生成）
  document.getElementById('mod-jnl').innerHTML=
    '<span class="mod-dr">（借）'+txResult.dr+'</span>'
    +'<br><span class="mod-cr">（貸）'+txResult.cr+'</span>';

  // Block2: なぜ
  document.getElementById('mod-why').textContent=ex.why;

  // Block3: 三表影響
  function setImpact(id,txt){
    var el=document.getElementById(id);
    var cl='mod-impact-val';
    if(txt.indexOf('影響なし')>=0) cl+=' inone';
    else if(txt.match(/増加|プラス|改善/)) cl+=' ipos';
    else if(txt.match(/減少|マイナス|悪化/)) cl+=' ineg';
    el.textContent=txt;
    el.className=cl;
  }
  setImpact('mod-bs',ex.bs);
  setImpact('mod-pl',ex.pl);
  setImpact('mod-cf',ex.cf);

  // Block4: 実務ポイント（<b>タグを許可）
  document.getElementById('mod-tip').innerHTML=ex.tip;

  // オーバーレイ表示
  document.getElementById('assist-modal-overlay').classList.add('open');
  document.body.style.overflow='hidden';
}

function closeModal(){
  document.getElementById('assist-modal-overlay').classList.remove('open');
  document.body.style.overflow='';
  pendingKey=null;
}

function execPending(){
  var key=pendingKey;
  closeModal();
  if(key) execTransaction(key);
}

function handleModalOverlayClick(e){
  if(e.target===document.getElementById('assist-modal-overlay')) closeModal();
}

// =====================================================
// EXPLAIN — 全取引の解説データ
// =====================================================
var EXPLAIN={
  cash_sales:{
    title:'現金売上',
    why:'商品やサービスを提供し、その場で現金を受け取った取引です。現金という資産が増えるので「借方：現金」、会社の稼ぎである売上（収益）が発生したので「貸方：売上」となります。収益は貸方（右）に記録するのが複式簿記の基本ルールです。',
    bs:'現金（流動資産）が増加',
    pl:'売上高が増加 → 利益増',
    cf:'営業活動CF が増加（現金で直接受取）',
    tip:'<b>発生主義 vs 現金主義：</b>この取引は「現金主義」と「発生主義」が一致するケースです。掛売上との違いを意識することで、発生主義の本質が理解しやすくなります。'
  },
  credit_sales:{
    title:'掛売上（売掛金計上）',
    why:'商品を引き渡したが、代金はまだ受け取っていない状態です。IFRS15に基づき、履行義務（商品引渡し）を果たした時点で収益を認識します。代金を受け取る権利（売掛金・資産）が生まれるので「借方：売掛金」、売上収益が発生したので「貸方：売上」です。',
    bs:'売掛金（流動資産）が増加',
    pl:'売上高が増加 → 利益増',
    cf:'影響なし（現金がまだ入っていないため）',
    tip:'<b>発生主義の核心：</b>現金を受け取っていなくても、履行義務を果たした瞬間に収益計上します。これがキャッシュフローと利益が乖離する主因です。'
  },
  collect_ar:{
    title:'売掛金の回収',
    why:'以前に計上した売掛金（代金請求権）を現金として回収した取引です。資産の形が「売掛金」から「現金」に変わるだけで、売上はすでに計上済みです。売掛金（資産）の減少は「貸方」、現金（資産）の増加は「借方」に記録します。',
    bs:'現金増加・売掛金減少（総資産の合計は変わらない）',
    pl:'影響なし（売上は掛売上のときに計上済み）',
    cf:'営業活動CF が増加（現金受取）',
    tip:'<b>CFと利益のタイムラグ：</b>CFの増加は掛売上の時点ではなくこの回収時です。売上が多くても回収が遅れると資金繰りが悪化する理由がここにあります。'
  },
  receive_advance:{
    title:'前受金の受取',
    why:'商品の引渡しやサービス提供の前に代金を受け取った取引です。まだ履行義務を果たしていないため、受け取った現金は「収益ではなく負債（前受金）」として計上します。現金（資産）の増加は「借方」、履行義務という負債の発生は「貸方」です。',
    bs:'現金増加・前受金（流動負債）増加',
    pl:'影響なし（まだ収益として認識できない）',
    cf:'営業活動CF が増加（現金受取）',
    tip:'<b>負債としての前受金：</b>お金を受け取っても、サービスを提供するまでは「お客様への債務」です。SaaS企業の前払い契約料などがこれにあたります。'
  },
  advance_to_sales:{
    title:'前受金を売上に振替',
    why:'商品を引き渡すかサービスを提供し、履行義務を果たしたタイミングで前受金（負債）を売上（収益）に振り替えます。負債（前受金）の消滅は「借方」、収益（売上）の発生は「貸方」です。このとき現金の動きはありません。',
    bs:'前受金（負債）が減少',
    pl:'売上高が増加 → 利益増',
    cf:'影響なし（現金の移動はない）',
    tip:'<b>IFRS15・5ステップモデル：</b>「履行義務の充足」が収益認識の引き金です。前受金→売上の振替はその具体的な会計処理であり、収益のタイミングを正しく管理する根拠となります。'
  },
  interest_income:{
    title:'受取利息の未収計上',
    why:'利息はサービスを受けた期間に対応して発生します（発生主義）。まだ現金を受け取っていなくても、当期に稼いだ利息は当期収益として計上します。請求権（未収利息・資産）が生まれるので「借方：未収利息」、収益発生なので「貸方：受取利息」です。',
    bs:'未収利息（流動資産）が増加',
    pl:'受取利息（営業外収益）が増加',
    cf:'影響なし（現金未受取のため）',
    tip:'<b>期間帰属の原則：</b>収益も費用も「発生した期間」に計上するのが発生主義です。現金の受取は翌期でも、当期分は当期に計上します。これが決算整理仕訳「見越し計上」の考え方です。'
  },
  collect_interest:{
    title:'未収利息の現金回収',
    why:'未収計上していた利息を現金で受け取りました。資産の形が「未収利息」から「現金」に変わるだけです。未収利息（資産）の消滅は「貸方」、現金（資産）の増加は「借方」に記録します。収益はすでに計上済みのためPLには影響しません。',
    bs:'現金増加・未収利息減少（資産の形が変わる）',
    pl:'影響なし（収益は未収計上時に認識済み）',
    cf:'営業活動CF が増加',
    tip:'<b>間接法CFの注意点：</b>間接法では未収利息の増減を運転資本調整項目として扱います。未収計上時はCFに影響せず、この回収時に初めて営業CFがプラスになります。'
  },
  dividend_income:{
    title:'受取配当金',
    why:'保有株式から配当金を現金で受け取りました。配当は株式保有という「権利」に基づく収益です。現金（資産）の増加は「借方」、営業外収益の発生は「貸方」に記録します。',
    bs:'現金（流動資産）が増加',
    pl:'受取配当金（営業外収益）が増加',
    cf:'営業活動CF が増加（日本基準の原則）',
    tip:'<b>IFRSと日本基準の違い：</b>IFRSでは受取配当金を「営業CF」または「投資CF」のどちらかに継続的に分類できます。日本基準では原則として営業CFです。'
  },
  fx_gain:{
    title:'為替差益',
    why:'外貨建の資産や取引を円換算した際に、円高により生じた利益です。現金が増加した場合は「借方：現金」、為替差益（営業外収益）は「貸方」に記録します。輸出企業では円安時に外貨建売掛金の評価益が生じることがあります。',
    bs:'現金（流動資産）が増加',
    pl:'為替差益（営業外収益）が増加',
    cf:'営業活動CF が増加',
    tip:'<b>為替リスク管理：</b>輸出企業は円高、輸入企業は円安でそれぞれ影響を受けます。先物為替予約などのヘッジ手段でリスクを軽減するのが実務の基本です。'
  },
  fx_loss:{
    title:'為替差損',
    why:'外貨建の資産や取引を円換算した際に、円安により生じた損失です。現金が減少する場合は「貸方：現金」、為替差損（営業外費用）は「借方」に記録します。損失・費用は借方（左）に記録するのが複式簿記の基本ルールです。',
    bs:'現金（流動資産）が減少',
    pl:'為替差損（営業外費用）が増加 → 利益減',
    cf:'営業活動CF が減少',
    tip:'<b>輸入企業のリスク：</b>輸入代金を外貨で支払う企業は円安で実質的なコストが上昇します。為替の動向を注視し、必要に応じてヘッジ手段を検討することが重要です。'
  },
  fx_translation_adj:{
    title:'為替換算調整勘定（OCI）',
    why:'在外子会社の財務諸表を円換算する際に生じる換算差額です。損益には計上せず純資産の「その他包括利益（OCI）」として直接計上します。この処理はPLを通過しないため、当期純利益には影響しません。',
    bs:'純資産のOCI累計額が増加',
    pl:'影響なし（PLを通過しないため）',
    cf:'影響なし（非現金取引）',
    tip:'<b>OCI（その他包括利益）：</b>PLには計上されないが純資産を動かす項目のことです。投資家は包括利益計算書を確認することで、OCI項目も含めた経営成績を把握できます。'
  },
  forward_contract_gain:{
    title:'先物為替予約 差益',
    why:'先物為替予約（将来の為替レートを今日約定する取引）の決済時に差益が生じました。現金の受取は「借方：現金」、差益（営業外収益）は「貸方」に記録します。ヘッジ会計を適用しない場合は差損益を即時損益認識します。',
    bs:'現金（流動資産）が増加',
    pl:'先物予約差益（営業外収益）が増加',
    cf:'営業活動CF が増加',
    tip:'<b>ヘッジ会計との違い：</b>ヘッジ会計を適用すると差損益をOCIに繰延べてヘッジ対象の損益と同期計上できます。適用には厳格な要件と文書化が必要です。'
  },
  forward_contract_loss:{
    title:'先物為替予約 差損',
    why:'先物為替予約の決済時に差損が生じました。現金の支払は「貸方：現金」、差損（営業外費用）は「借方」に記録します。ヘッジが想定通りに機能しなかった場合や、ヘッジ非適用の場合も同様の処理をします。',
    bs:'現金（流動資産）が減少',
    pl:'先物予約差損（営業外費用）が増加 → 利益減',
    cf:'営業活動CF が減少',
    tip:'<b>デリバティブの両面性：</b>先物予約はリスクを軽減できる一方、相場が予測と逆に動けば差損も生じます。投機目的での利用は財務リスクを高めます。'
  },
  equity_method_income:{
    title:'持分法投資利益',
    why:'関連会社（持分20〜50%保有）が利益を計上した場合、持分比率に応じた金額を自社の収益として認識します。現金は動かず、投資有価証券（資産）を増やすことで利益参加を表現します。「借方：投資有価証券」「貸方：持分法投資利益」です。',
    bs:'投資有価証券（固定資産）が増加',
    pl:'持分法投資利益（営業外収益）が増加',
    cf:'影響なし（非現金取引・配当受取時にCF増加）',
    tip:'<b>持分法の本質：</b>関連会社の利益は実際には現金が入らないためCFは動きません。配当を受け取った場合に初めてCFのプラスになります（同時に投資有価証券が減少）。'
  },
  equity_method_loss:{
    title:'持分法投資損失',
    why:'関連会社が損失を計上した場合、持分比率に応じた損失を自社の費用として認識します。投資有価証券（資産）を減らすことで損失参加を表現します。「借方：持分法投資損失」「貸方：投資有価証券」です。',
    bs:'投資有価証券（固定資産）が減少',
    pl:'持分法投資損失（営業外費用）が増加 → 利益減',
    cf:'影響なし（非現金取引）',
    tip:'<b>投資額の限度：</b>持分法では原則として、投資有価証券がゼロになった後はそれ以上損失を計上しません。超過損失の取扱いは状況によります。'
  },
  cash_purchase:{
    title:'現金仕入',
    why:'商品を仕入れ、その場で現金を支払いました。三分法では仕入を費用として直接記録します。仕入（費用）の発生は「借方」、現金（資産）の減少は「貸方」です。費用は借方（左）に記録するのが複式簿記の基本ルールです。',
    bs:'現金（流動資産）が減少',
    pl:'仕入高（売上原価の構成要素）が増加 → 利益減',
    cf:'営業活動CF が減少（現金支払）',
    tip:'<b>三分法と分記法：</b>三分法は「仕入」勘定で直接費用計上し期末棚卸で資産調整します。分記法は販売時に直接売上原価を計算します。日本の実務では三分法が主流です。'
  },
  credit_purchase:{
    title:'掛仕入（買掛金計上）',
    why:'商品を仕入れたが、代金はまだ支払っていない状態です。仕入（費用）の発生は「借方」、代金を支払う義務（買掛金・負債）の発生は「貸方」です。商品は手元にあるが現金はまだ出ていません。',
    bs:'買掛金（流動負債）が増加',
    pl:'仕入高（売上原価）が増加 → 利益減',
    cf:'影響なし（現金未払いのため）',
    tip:'<b>支払サイトの活用：</b>掛仕入の支払いを遅らせることで手元の現金を長く保持できます。DPO（買掛回転日数）を延ばすのは運転資本改善の基本戦略です。'
  },
  pay_ap:{
    title:'買掛金の支払',
    why:'以前に計上した買掛金（代金支払義務）を現金で決済した取引です。負債（買掛金）の消滅は「借方」、現金（資産）の減少は「貸方」です。仕入はすでに計上済みなのでPLへの影響はありません。',
    bs:'現金減少・買掛金（流動負債）減少',
    pl:'影響なし（仕入費用は掛仕入時に計上済み）',
    cf:'営業活動CF が減少（現金支払）',
    tip:'<b>CFと利益のタイムラグ（費用版）：</b>費用はPLに早く計上されますが、CFへの影響は現金支払い時です。利益があってもCFがマイナスになりえる理由の一つです。'
  },
  pay_salary:{
    title:'給与の現金支払',
    why:'従業員に給与を現金で支払いました。人件費（費用）の発生は「借方」、現金（資産）の減少は「貸方」です。給与は販売費及び一般管理費（販管費）に分類される主要な費用項目です。',
    bs:'現金（流動資産）が減少',
    pl:'人件費（販管費）が増加 → 利益減',
    cf:'営業活動CF が減少（現金支払）',
    tip:'<b>人件費と固定費：</b>給与は多くの場合、売上に関わらず発生する固定費です。売上が落ちても給与は払い続けなければならないため、固定費の水準管理が経営の重要課題です。'
  },
  accrue_salary:{
    title:'未払給与の計上',
    why:'当期に従業員が働いたが、給与の支払いは翌期になる場合、発生主義に基づいて当期の費用として計上します。費用（給与）の発生は「借方」、支払義務（未払費用・負債）の発生は「貸方」です。',
    bs:'未払費用（流動負債）が増加',
    pl:'人件費（販管費）が増加 → 利益減',
    cf:'影響なし（現金未払いのため）',
    tip:'<b>決算整理仕訳「見越し」：</b>期末に未払費用を計上する作業を「見越し計上」と呼びます。費用を適切な期間に帰属させることで期間損益計算の正確性が高まります。'
  },
  pay_accrued:{
    title:'未払費用の支払',
    why:'前期末に計上した未払費用（支払義務）を現金で決済しました。負債（未払費用）の消滅は「借方」、現金（資産）の減少は「貸方」です。費用はすでに前期に計上されているためPLへの影響はありません。',
    bs:'現金減少・未払費用（流動負債）減少',
    pl:'影響なし（費用は未払計上時に認識済み）',
    cf:'営業活動CF が減少（現金支払）',
    tip:'<b>期をまたぐ費用の追跡：</b>未払費用の支払いはCFを動かしますがPLには影響しません。間接法のCF作成では「未払費用の増減」として運転資本調整項目になります。'
  },
  ad_expense:{
    title:'広告宣伝費',
    why:'広告・宣伝のための現金支出です。広告宣伝費（費用）の発生は「借方」、現金（資産）の減少は「貸方」です。その効果が将来にわたると考えられる場合でも、日本基準では原則として全額当期費用として処理します。',
    bs:'現金（流動資産）が減少',
    pl:'広告宣伝費（販管費）が増加 → 利益減',
    cf:'営業活動CF が減少',
    tip:'<b>費用処理 vs 資産計上：</b>日本基準では広告宣伝費は全額費用処理です。IFRSでは特定条件下で無形資産計上できる場合もありますが、非常に限定的です。'
  },
  rd_expense:{
    title:'研究開発費',
    why:'研究・開発活動のための現金支出です。研究開発費（費用）の発生は「借方」、現金（資産）の減少は「貸方」です。将来の収益につながる可能性があっても、日本基準では全額を当期費用として処理することが義務付けられています。',
    bs:'現金（流動資産）が減少',
    pl:'研究開発費（販管費）が増加 → 利益減',
    cf:'営業活動CF が減少',
    tip:'<b>IFRSとの重要な差異：</b>IFRSでは開発フェーズの支出は無形資産に計上できます（研究フェーズは費用）。そのため日本基準採用企業は費用が多く計上され、短期的に利益が押し下げられます。'
  },
  prepaid_expense:{
    title:'前払費用の計上',
    why:'翌期以降に費用が発生するサービス（保険料・家賃など）を前払いした取引です。支払い時点ではまだ費用ではないため、「前払費用（資産）」として計上します。現金（資産）の減少は「貸方」、前払費用（資産）の増加は「借方」です。',
    bs:'現金減少・前払費用（流動資産）増加',
    pl:'影響なし（まだ費用として使われていない）',
    cf:'営業活動CF が減少（現金支払時）',
    tip:'<b>繰延べの考え方：</b>前払費用は「払ったが使っていない費用」です。期末に残っている前払費用を翌期費用に振り替えることを「経過勘定の整理」と呼びます。'
  },
  expense_prepaid:{
    title:'前払費用を費用に振替',
    why:'前払いしていたサービスの提供を受けた（費用が発生した）時点で、前払費用（資産）を費用に振り替えます。資産（前払費用）の消滅は「貸方」、費用の発生は「借方」です。現金の動きはありません。',
    bs:'前払費用（流動資産）が減少',
    pl:'該当費用（販管費等）が増加 → 利益減',
    cf:'影響なし（現金の動きなし）',
    tip:'<b>期間対応の原則：</b>費用はサービスを受けた期間に計上します。年間保険料を一括前払いした場合、毎月または期末に按分して費用計上するのが正確な会計処理です。'
  },
  prepay_advance:{
    title:'仮払金の支払',
    why:'使途や金額が未確定な現金の先払い（出張費の概算前渡しなど）です。正式な費用科目が確定していないため、「仮払金（資産）」として一時的に計上します。現金（資産）の減少は「貸方」、仮払金（資産）の増加は「借方」です。',
    bs:'現金減少・仮払金（流動資産）増加',
    pl:'影響なし（費用科目が未確定）',
    cf:'営業活動CF が減少',
    tip:'<b>仮払金の管理：</b>仮払金は精算されるまで資産のまま残ります。長期間未精算の仮払金は内部統制上の問題となりうるため、月次での精算管理が重要です。'
  },
  settle_advance:{
    title:'仮払金の精算',
    why:'仮払金の使途が確定し、正式な費用科目に振り替えます。仮払金（資産）の消滅は「貸方」、確定した費用の発生は「借方」です。追加精算や返金がある場合は現金の授受も伴います。',
    bs:'仮払金（流動資産）が減少',
    pl:'確定した費用が増加 → 利益減',
    cf:'影響なし（精算のみ、現金授受は別途）',
    tip:'<b>精算書の重要性：</b>領収書・精算書の整備は経費の適正処理と税務申告の根拠になります。証憑管理は内部統制の基本であり、電子化による効率化が進んでいます。'
  },
  pay_interest:{
    title:'支払利息',
    why:'借入金に対する利息を現金で支払いました。支払利息（費用）の発生は「借方」、現金（資産）の減少は「貸方」です。利息は借入という「時間の対価」であり、営業外費用として分類されます。',
    bs:'現金（流動資産）が減少',
    pl:'支払利息（営業外費用）が増加 → 利益減',
    cf:'営業活動CF が減少（日本基準）',
    tip:'<b>IFRSの選択：</b>IFRSでは支払利息を「営業CF」「財務CF」のどちらかに継続的に分類できます。日本基準は原則営業CFです。財務分析では分類の違いに注意が必要です。'
  },
  accrue_bad_debt:{
    title:'貸倒引当金繰入',
    why:'売掛金の一部が回収不能になるリスクを見積もり、当期費用として引当金を設定します。保守主義の原則に基づき、損失が発生する可能性が高い場合は早期に計上します。費用の発生は「借方」、引当金（資産のマイナス）の設定は「貸方」です。',
    bs:'貸倒引当金（売掛金の控除項目）が増加',
    pl:'貸倒引当金繰入（販管費）が増加 → 利益減',
    cf:'影響なし（非現金取引）',
    tip:'<b>実績率法と個別評価：</b>中小企業では過去の貸倒実績から繰入率を算定する「実績率法」が一般的です。大口債権は個別に回収可能性を評価する「個別評価」を行います。'
  },
  bad_debt_writeoff:{
    title:'貸倒実際発生',
    why:'売掛金が実際に回収不能になった取引です。すでに引当金が設定されている場合は、引当金と売掛金を相殺します。引当金（資産のマイナス）の消滅は「借方」、売掛金（資産）の消滅は「貸方」です。損失は引当計上時に認識済みのためPLへの影響はありません。',
    bs:'売掛金・貸倒引当金が同額減少（BS合計は変わらず）',
    pl:'影響なし（損失は引当計上時に認識済み）',
    cf:'影響なし（非現金取引）',
    tip:'<b>引当金の役割：</b>引当金を設定することで、損失の計上を実際の貸倒発生時ではなく見込み時に行えます。これにより期間損益の平滑化と財務情報の有用性が高まります。'
  },
  accrue_retirement:{
    title:'退職給付引当金の計上',
    why:'従業員が当期に積み上げた将来の退職給付（退職金・年金）を当期費用として計上します。退職後に支払う義務（負債）が今期の勤務によって発生するため、発生主義に基づき費用認識します。費用は「借方」、引当金（固定負債）は「貸方」です。',
    bs:'退職給付引当金（固定負債）が増加',
    pl:'退職給付費用（販管費）が増加 → 利益減',
    cf:'影響なし（非現金取引）',
    tip:'<b>数理計算上の差異：</b>退職給付は将来の支払額を現在価値に割り引いて計算します。割引率や給与上昇率などの見積もり変更が「数理計算上の差異」となり、追加の会計処理が必要です。'
  },
  pay_retirement:{
    title:'退職給付の実際支払',
    why:'退職した従業員に退職金を現金で支払いました。計上済みの引当金（負債）を取り崩します。引当金（固定負債）の消滅は「借方」、現金（資産）の減少は「貸方」です。費用はすでに計上済みなのでPLへの影響はありません。',
    bs:'現金減少・退職給付引当金（固定負債）減少',
    pl:'影響なし（費用は引当計上時に認識済み）',
    cf:'営業活動CF が減少（現金支払）',
    tip:'<b>企業年金との関係：</b>確定給付型企業年金がある場合、年金資産と退職給付債務の差額（積立不足）が退職給付引当金として計上されます。運用成果次第で引当金額が変動します。'
  },
  warranty_provision:{
    title:'製品保証引当金の計上',
    why:'販売した製品について将来無償修理や交換が必要になるリスクを見積もり引当金を設定します。IAS37に基づき、過去の実績率から合理的に推計した金額を当期費用として計上します。費用は「借方」、引当金（流動負債）は「貸方」です。',
    bs:'製品保証引当金（流動負債）が増加',
    pl:'製品保証費用（販管費）が増加 → 利益減',
    cf:'影響なし（非現金取引）',
    tip:'<b>引当金計上の3要件（IAS37）：</b>①過去の事象から生じる現在の義務、②経済的便益の流出が起こる可能性が高い、③金額の信頼性ある見積もりが可能、の3つを満たす場合に計上します。'
  },
  restructuring_provision:{
    title:'リストラクチャリング引当金',
    why:'リストラ計画が具体化し、その実施について有効な合意がある場合に、将来のリストラ費用（人件費・拠点閉鎖コストなど）を引当金として計上します。費用は「借方：リストラ費用」、引当金（負債）は「貸方」です。',
    bs:'リストラ引当金（流動または固定負債）が増加',
    pl:'リストラ費用が増加 → 利益に大きなマイナス',
    cf:'影響なし（非現金・現金支出は将来）',
    tip:'<b>IAS37の厳格要件：</b>単なる「計画」では不十分で、詳細な公式計画の策定と実施着手または公表が必要です。引当計上のタイミングは監査上も重要な論点です。'
  },
  closing_begin_inv:{
    title:'期首商品を仕入勘定に振替',
    why:'三分法では期首（前期末残）の商品を「仕入」勘定に振り替えることで売上原価の計算に組み込みます。前期末に「繰越商品（資産）」として残っていた商品は、当期の売上に充てるための「仕入（費用）」になります。',
    bs:'繰越商品（流動資産）が減少',
    pl:'仕入高（売上原価の構成要素）が増加',
    cf:'影響なし（帳簿上の振替のみ）',
    tip:'<b>三分法の売上原価計算：</b>売上原価 ＝ 期首商品 ＋ 当期仕入 − 期末商品。この振替は「期首商品を仕入に足す」第1ステップです。決算整理仕訳の核心部分です。'
  },
  closing_end_inv:{
    title:'期末商品を繰越商品に振替',
    why:'当期末に残っている商品（まだ売れていないもの）を「繰越商品（資産）」として計上し、仕入（費用）から差し引きます。これにより当期の売上に対応する原価（売上原価）だけがPLに残ります。',
    bs:'繰越商品（流動資産）が増加',
    pl:'仕入高（売上原価）が減少（期末棚卸分を差引き）',
    cf:'影響なし（帳簿上の振替のみ）',
    tip:'<b>棚卸資産の評価方法：</b>期末商品の評価方法（先入先出法・平均法など）の選択は、インフレ時代には利益額に大きく影響します。一度選択した方法は継続適用が原則です。'
  },
  inventory_loss:{
    title:'棚卸減耗損',
    why:'実地棚卸の結果、帳簿上の数量より実際の数量が少なかった場合に計上します。紛失・盗難・自然消耗などが原因です。実態に合わせて繰越商品（資産）を減らし、棚卸減耗損（費用）として計上します。',
    bs:'繰越商品（流動資産）が減少',
    pl:'棚卸減耗損（売上原価または販管費）が増加 → 利益減',
    cf:'影響なし（非現金取引）',
    tip:'<b>内部統制との関係：</b>棚卸減耗損が頻繁・多額に発生する場合は在庫管理体制に問題がある可能性があります。倉庫管理システムの導入や定期的な棚卸が再発防止の鍵です。'
  },
  inventory_writedown:{
    title:'商品評価損（低価法）',
    why:'棚卸資産の正味売却価額（時価）が帳簿価額を下回った場合、切り下げが義務付けられています（強制適用の低価法）。時価の下落は実態の悪化を示すため、保守主義の原則に基づき損失を早期計上します。',
    bs:'繰越商品（流動資産）が減少',
    pl:'商品評価損（売上原価）が増加 → 利益減',
    cf:'影響なし（非現金取引）',
    tip:'<b>洗替え法と切放し法：</b>翌期に時価が回復した場合、洗替え法では評価損を戻し入れますが切放し法では戻し入れません。日本基準では両方の選択が可能です（IFRSは洗替え法）。'
  },
  buy_equipment:{
    title:'機械設備の購入',
    why:'長期間使用する機械設備を現金で購入しました。1年以上使用する有形固定資産は購入時に資産計上し、耐用年数にわたって減価償却します。設備（資産）の増加は「借方」、現金（資産）の減少は「貸方」です。',
    bs:'機械設備（固定資産）が増加・現金が減少',
    pl:'影響なし（購入時は費用処理しない）',
    cf:'投資活動CF が減少（設備投資）',
    tip:'<b>資本的支出 vs 修繕費：</b>設備の価値を高めたり耐用年数を延ばす支出は「資本的支出（資産計上）」、単なる維持・補修は「修繕費（費用処理）」として区別します。'
  },
  buy_building:{
    title:'建物の購入',
    why:'事業用建物を現金で購入しました。建物は長期資産として固定資産に計上し、耐用年数にわたって減価償却します（土地は除く）。建物（資産）の増加は「借方」、現金（資産）の減少は「貸方」です。',
    bs:'建物（固定資産）が増加・現金が減少',
    pl:'影響なし（購入時は費用処理しない）',
    cf:'投資活動CF が減少（設備投資）',
    tip:'<b>日本基準 vs IFRS：</b>日本基準では原則として取得原価主義（購入価格で評価）。IFRSでは再評価モデル（公正価値で評価）が選択可能で、時価上昇分はOCIに計上されます。'
  },
  buy_land:{
    title:'土地の購入',
    why:'事業用土地を現金で購入しました。土地は建物と異なり、時間が経過しても価値が損なわれないと考えられるため減価償却を行いません（非償却資産）。土地（資産）の増加は「借方」、現金（資産）の減少は「貸方」です。',
    bs:'土地（固定資産）が増加・現金が減少',
    pl:'影響なし（償却も費用処理もしない）',
    cf:'投資活動CF が減少（土地取得）',
    tip:'<b>非償却資産：</b>土地・美術品・骨董品など価値が目減りしないとみなされる資産は減価償却しません。ただし地盤沈下や環境汚染がある場合は減損を検討します。'
  },
  sell_asset:{
    title:'固定資産の売却（売却益）',
    why:'帳簿価額¥1,000の設備を¥1,500で売却しました。受取額と帳簿価額の差額が売却益です。現金（資産）の増加は「借方」、設備（資産）の消滅と売却益（収益）は「貸方」に分けて記録します。',
    bs:'現金増加・機械設備（固定資産）減少',
    pl:'固定資産売却益（営業外収益）が増加',
    cf:'投資活動CF が増加（売却による入金）',
    tip:'<b>税務上の取扱い：</b>固定資産の売却益は課税対象です。また間接法CFでは純利益に含まれる売却益を「投資活動への振替」として調整する必要があります。'
  },
  sell_asset_loss:{
    title:'固定資産の売却（売却損）',
    why:'帳簿価額¥1,000の設備を¥700で売却しました。受取額が帳簿価額を下回るため売却損が生じます。現金（資産）の増加と売却損（費用）は「借方」、設備（資産）の消滅は「貸方」に記録します。',
    bs:'現金増加・機械設備（固定資産）減少',
    pl:'固定資産売却損（営業外費用）が増加 → 利益減',
    cf:'投資活動CF が増加（売却による入金）',
    tip:'<b>除却 vs 売却：</b>設備を廃棄する場合は「固定資産除却損」として処理します。売却損とは異なり、除却では現金収入がなく帳簿価額全額が損失になります。'
  },
  depreciation:{
    title:'減価償却費の計上',
    why:'固定資産（建物・機械など）は使用に伴い価値が低下します。この価値の低下分を費用（減価償却費）として当期に配分します。費用の発生は「借方」、資産の価値減少（減価償却累計額）は「貸方」です。現金の支出はありません。',
    bs:'減価償却累計額が増加 → 固定資産の帳簿価額が減少',
    pl:'減価償却費（販管費）が増加 → 利益減',
    cf:'影響なし（非現金取引・間接法では純利益に加算）',
    tip:'<b>非現金費用の重要性：</b>減価償却費は現金が出ない費用です。間接法CF作成時に純利益に「加算」するのはこのためです。CF≧利益となりやすい会社は設備投資が進んでいる証拠でもあります。'
  },
  impairment:{
    title:'減損損失の計上',
    why:'固定資産やのれんの収益性が著しく低下し、帳簿価額が回収可能価額を上回った場合にその差額を減損損失として計上します。IAS36に基づき、減損の兆候がある場合は必ず減損テストを実施する義務があります。',
    bs:'固定資産またはのれんの帳簿価額が直接減少',
    pl:'減損損失（特別損失相当）が増加 → 利益に大きなマイナス',
    cf:'影響なし（非現金取引・間接法では純利益に加算）',
    tip:'<b>減損 vs 減価償却：</b>減価償却は予定通りの価値低下、減損は予想外の価値急落です。のれんはIFRSで年次減損テスト必須、日本基準では20年償却に加え減損も行います。'
  },
  buy_goodwill:{
    title:'のれんの取得（M&A）',
    why:'M&A（企業買収）で支払った対価が被買収企業の純資産公正価値を超えた部分が「のれん」です。ブランド力・人材・顧客基盤などの超過収益力に対するプレミアムです。のれん（無形固定資産）の増加は「借方」、現金（資産）の減少は「貸方」です。',
    bs:'のれん（無形固定資産）が増加・現金が減少',
    pl:'影響なし（取得時は費用処理しない）',
    cf:'投資活動CF が減少（M&A投資）',
    tip:'<b>日本基準 vs IFRS：</b>日本基準はのれんを20年以内で均等償却します。IFRSは償却せず毎年減損テストを実施します。IFRSのほうが1株利益が高く見えやすい傾向があります。'
  },
  amortize_goodwill:{
    title:'のれんの償却',
    why:'のれんを耐用年数（20年以内）にわたって均等に費用配分します（日本基準）。のれん（資産）の価値が毎期減少するため、費用（のれん償却）を「借方」に、のれん（資産）の減少を「貸方」に記録します。',
    bs:'のれん（無形固定資産）の帳簿価額が減少',
    pl:'のれん償却（販管費または営業外費用）が増加 → 利益減',
    cf:'影響なし（非現金取引・間接法では純利益に加算）',
    tip:'<b>日本基準のみの処理：</b>IFRSを採用する企業はのれんを償却しないため、日本基準採用企業は毎期のれん償却分だけ利益が低く計上されます。M&A後の比較分析では要注意です。'
  },
  pay_deposit:{
    title:'敷金・保証金の支払',
    why:'不動産賃貸における敷金や保証金を現金で支払いました。契約終了時に返還される性質があるため費用ではなく「資産（投資その他の資産）」として計上します。敷金（資産）の増加は「借方」、現金（資産）の減少は「貸方」です。',
    bs:'敷金・保証金（投資その他の資産）が増加・現金が減少',
    pl:'影響なし（返還が予定される資産のため）',
    cf:'投資活動CF が減少',
    tip:'<b>貸し倒れリスク：</b>賃貸人が倒産した場合、敷金が返還されないリスクがあります。その場合は回収不能額を「敷金償却」として損失計上します。'
  },
  buy_investment:{
    title:'投資有価証券の取得',
    why:'長期保有目的で株式を取得しました。投資有価証券（固定資産・投資等）の増加は「借方」、現金（資産）の減少は「貸方」です。売買目的有価証券（流動資産）と異なり、長期保有目的は固定資産に分類します。',
    bs:'投資有価証券（固定資産）が増加・現金が減少',
    pl:'影響なし（取得時は損益計上しない）',
    cf:'投資活動CF が減少（長期投資）',
    tip:'<b>保有目的による分類：</b>売買目的（時価評価・評価損益をPLへ）、満期保有目的（原価法）、その他有価証券（時価評価・評価差額をOCIへ）と、目的により会計処理が大きく異なります。'
  },
  sell_investment:{
    title:'投資有価証券の売却',
    why:'保有していた投資有価証券を売却しました。帳簿価額と売却価額の差が売却損益です。現金（資産）の増加は「借方」、投資有価証券（資産）の消滅と売却益（収益）は「貸方」に分けて記録します。',
    bs:'現金増加・投資有価証券（固定資産）減少',
    pl:'固定資産・投資売却益（営業外収益）が増加',
    cf:'投資活動CF が増加（売却による入金）',
    tip:'<b>キャピタルゲイン課税：</b>法人の有価証券売却益は通常の法人所得と合算して法人税が課されます。税引後の実質リターンを考慮した投資判断が重要です。'
  },
  invest_valuation_up:{
    title:'投資有価証券の評価益（OCI）',
    why:'その他有価証券（長期保有目的株式）の時価が帳簿価額を上回った場合の評価差額です。PL（損益計算書）を経由せず、直接「その他包括利益（OCI）」として純資産に計上します。現金は動きません。',
    bs:'投資有価証券増加・純資産（OCI）増加',
    pl:'影響なし（PLを経由しないため）',
    cf:'影響なし（非現金取引）',
    tip:'<b>全部純資産直入法：</b>日本基準では評価差額（税効果後）を全額純資産のOCIに計上します。売却時に初めてPLに実現損益として計上されます（リサイクリング）。'
  },
  invest_valuation_dn:{
    title:'投資有価証券の評価損（PL）',
    why:'株式の時価が帳簿価額より著しく下落（通常50%超）した場合は、回復の見込みがないとして強制的にPL（損益計算書）に評価損を計上します。通常の時価下落（OCI計上）とは異なりPLに直接影響します。',
    bs:'投資有価証券（固定資産）が減少',
    pl:'投資有価証券評価損（営業外費用）が増加 → 利益に大きなマイナス',
    cf:'影響なし（非現金取引）',
    tip:'<b>著しい下落の基準：</b>時価が取得価額の50%以上下落した場合は「著しい下落」と判定するのが実務上の基準です（30〜50%は回復可能性を判断）。計上した評価損は翌期以降に戻し入れできません。'
  },
  borrow_short:{
    title:'短期借入金',
    why:'金融機関から1年以内に返済する条件で資金を借り入れました。現金（資産）の増加は「借方」、返済義務（短期借入金・流動負債）の発生は「貸方」です。借入は収益ではないためPLには影響しません。',
    bs:'現金（流動資産）増加・短期借入金（流動負債）増加',
    pl:'影響なし（借入は収益ではない）',
    cf:'財務活動CF が増加（資金調達）',
    tip:'<b>短期 vs 長期：</b>1年以内返済なら「短期借入金（流動負債）」、1年超なら「長期借入金（固定負債）」に分類します。流動比率の計算に影響するため、格付けや信用分析上も重要な区分です。'
  },
  repay_short:{
    title:'短期借入金の返済',
    why:'短期借入金を現金で返済しました。負債（短期借入金）の消滅は「借方」、現金（資産）の減少は「貸方」です。元本の返済はPLに影響しませんが、支払った利息は支払利息（費用）として別途計上します。',
    bs:'現金（流動資産）減少・短期借入金（流動負債）減少',
    pl:'影響なし（元本返済は費用でない）',
    cf:'財務活動CF が減少（借入返済）',
    tip:'<b>元本 vs 利息：</b>借入金の「元本返済」は財務CFの減少です。「利息支払」は営業CFの減少（日本基準）です。CF計算書での分類が異なるので注意が必要です。'
  },
  borrow_long:{
    title:'長期借入金',
    why:'金融機関から1年超の返済条件で資金を借り入れました。現金（資産）の増加は「借方」、返済義務（長期借入金・固定負債）の発生は「貸方」です。長期の安定した資金調達であり、設備投資などの財源となります。',
    bs:'現金（流動資産）増加・長期借入金（固定負債）増加',
    pl:'影響なし（借入は収益ではない）',
    cf:'財務活動CF が増加（長期資金調達）',
    tip:'<b>財務レバレッジ：</b>負債を活用して自己資本以上の資産を運用することを財務レバレッジといいます。うまく活用するとROEを高められますが、過大な借入は財務リスクを高めます。'
  },
  repay_long:{
    title:'長期借入金の返済',
    why:'長期借入金を現金で返済しました。負債（長期借入金）の消滅は「借方」、現金（資産）の減少は「貸方」です。デレバレッジ（負債の削減）により財務体質が改善します。',
    bs:'現金（流動資産）減少・長期借入金（固定負債）減少',
    pl:'影響なし（元本返済は費用でない）',
    cf:'財務活動CF が減少（借入返済）',
    tip:'<b>繰上返済と違約金：</b>固定金利の長期借入を繰上返済する場合、金融機関に違約金（期前弁済手数料）を支払うケースがあります。その場合は営業外費用として計上します。'
  },
  short_loan_out:{
    title:'短期貸付金の実行',
    why:'他社や関係会社に短期の資金を貸し付けました。短期貸付金（流動資産）の増加は「借方」、現金（資産）の減少は「貸方」です。将来回収できる権利として資産に計上します。',
    bs:'短期貸付金（流動資産）増加・現金（流動資産）減少',
    pl:'影響なし（貸付は費用でも収益でもない）',
    cf:'投資活動CF が減少（貸付実行）',
    tip:'<b>貸付と出資の違い：</b>貸付は返済義務のある債権（資産）ですが、出資は返済義務のない資本性のもの（投資有価証券）です。会計処理も税務上の取扱いも異なります。'
  },
  collect_loan_out:{
    title:'短期貸付金の回収',
    why:'実行していた短期貸付金を現金で回収しました。資産の形が「短期貸付金」から「現金」に変わるだけです。短期貸付金（資産）の消滅は「貸方」、現金（資産）の増加は「借方」に記録します。',
    bs:'現金（流動資産）増加・短期貸付金（流動資産）減少',
    pl:'影響なし（利息収益は別途計上）',
    cf:'投資活動CF が増加（貸付回収）',
    tip:'<b>回収不能リスク：</b>貸付先が経営悪化した場合は貸倒引当金を設定するか、貸倒損失を直接計上します。関係会社への過大な貸付は連結財務諸表でも要注意項目です。'
  },
  issue_bond:{
    title:'社債の発行',
    why:'社債を発行して投資家から資金を調達しました。現金（資産）の増加は「借方」、社債（固定負債・返済義務）の発生は「貸方」です。社債は借入金と異なり、市場で売買できる有価証券として発行します。',
    bs:'現金（流動資産）増加・社債（固定負債）増加',
    pl:'影響なし（発行時は収益でない）',
    cf:'財務活動CF が増加（社債発行による調達）',
    tip:'<b>社債 vs 借入金：</b>社債は市場で売買できるため多数の投資家から資金調達できます。一方、信用格付けの公開が必要であり、格付け低下は調達コスト上昇に直結します。'
  },
  redeem_bond:{
    title:'社債の償還',
    why:'満期を迎えた社債を額面金額で現金償還しました。社債（固定負債）の消滅は「借方」、現金（資産）の減少は「貸方」です。利払いは別途「支払利息」として計上します。',
    bs:'現金（流動資産）減少・社債（固定負債）減少',
    pl:'影響なし（元本償還は費用でない）',
    cf:'財務活動CF が減少（社債の元本返済）',
    tip:'<b>割引発行と社債発行差金：</b>社債を額面より低い価格で発行した場合の差額（社債発行差金）は、満期まで実効利率法で償却します。これにより表面利率と実効利率の差が費用化されます。'
  },
  issue_stock:{
    title:'株式の発行（増資）',
    why:'新株を発行し、投資家から払込金を受け取りました。払込額の2分の1は「資本金（純資産）」、残り2分の1は「資本準備金（純資産）」に計上します（会社法445条）。現金（資産）の増加は「借方」です。',
    bs:'現金（流動資産）増加・資本金・資本準備金（純資産）増加',
    pl:'影響なし（増資は収益ではない）',
    cf:'財務活動CF が増加（株式発行による調達）',
    tip:'<b>希薄化効果：</b>新株発行により発行済株式数が増えると、既存株主の1株当たり利益（EPS）や議決権比率が薄まります。第三者割当増資の場合は既存株主への説明が特に重要です。'
  },
  buy_treasury:{
    title:'自己株式の取得',
    why:'市場や株主から自社株を買い戻しました。自己株式は純資産の「控除項目（マイナス）」として計上します。会計上は資産でも費用でもなく純資産の減少です。現金（資産）の減少は「貸方」、自己株式の増加（純資産のマイナス）は「借方」です。',
    bs:'現金（流動資産）減少・自己株式（純資産のマイナス）増加',
    pl:'影響なし（自社株取得は費用でない）',
    cf:'財務活動CF が減少（自己株式取得）',
    tip:'<b>株主還元の手段：</b>自己株式取得は配当と並ぶ主要な株主還元策です。EPSの向上や資本効率改善の効果があります。TOBやMBO（経営者による買収）でも多用されます。'
  },
  cancel_treasury:{
    title:'自己株式の消却',
    why:'保有していた自己株式を消却（廃棄）しました。自己株式（純資産のマイナス）の消滅は「貸方」、消却に充てた資本準備金（純資産）の減少は「借方」です。純資産の合計額に変化はありません。',
    bs:'自己株式・資本準備金が同額減少（純資産合計は不変）',
    pl:'影響なし（純資産内の振替のみ）',
    cf:'影響なし（現金の移動なし）',
    tip:'<b>消却と売却の違い：</b>自己株式を消却すると発行済株式数が永続的に減少します。売却（処分）した場合は再び流通株式となります。消却のほうが完全な株式数削減になります。'
  },
  pay_dividend:{
    title:'配当の支払',
    why:'株主に利益配当を現金で支払いました。配当は「利益の分配」であり費用ではなく純資産（繰越利益剰余金）の減少です。繰越利益剰余金（純資産）の減少は「借方」、現金（資産）の減少は「貸方」です。',
    bs:'現金（流動資産）減少・繰越利益剰余金（純資産）減少',
    pl:'影響なし（配当は費用に計上しない）',
    cf:'財務活動CF が減少（株主への支払）',
    tip:'<b>配当規制：</b>会社法上、剰余金の配当には分配可能額の制限があります。純資産の部から資本金・準備金を除いた範囲内でしか配当できません。過大配当は違法となります。'
  },
  stock_option:{
    title:'ストックオプションの費用化',
    why:'役員・従業員に付与したストックオプション（新株予約権）の公正価値を費用として計上します。IFRS2・企業会計基準8号に基づき、権利確定期間にわたってサービスの対価として費用計上します。現金は動きません。',
    bs:'新株予約権（純資産）が増加',
    pl:'株式報酬費用（販管費）が増加 → 利益減',
    cf:'影響なし（非現金取引）',
    tip:'<b>EBITDAへの影響：</b>ストックオプション費用は非現金費用なので、EBITDAや調整後EBITDAではしばしば加算調整されます。スタートアップ企業では特に重要な調整項目です。'
  },
  oci_item:{
    title:'その他包括利益（OCI）の計上',
    why:'当期純利益には含まれないが純資産を変動させる項目（外貨換算差額・有価証券評価差額など）をOCIとして計上します。PLを通過せず直接純資産に計上するため、当期純利益には影響しません。',
    bs:'その他包括利益累計額（純資産）が増加',
    pl:'影響なし（PLを経由しないため）',
    cf:'影響なし（非現金取引）',
    tip:'<b>包括利益計算書：</b>当期純利益＋その他包括利益＝包括利益です。IFRSや日本基準とも包括利益計算書の開示が義務付けられており、OCI項目の影響を株主が確認できます。'
  },
  minority_interest:{
    title:'非支配株主持分の計上',
    why:'連結子会社への出資の一部を非支配株主（親会社以外の株主）が保有している場合、その持分を連結BSに計上します。連結グループ全体の資産・負債を計上した際に、親会社が「所有していない」部分を純資産の中で区分表示します。',
    bs:'現金（流動資産）増加・非支配株主持分（純資産）増加',
    pl:'影響なし（資本取引）',
    cf:'財務活動CF が増加（子会社への追加出資）',
    tip:'<b>連結会計の本質：</b>連結財務諸表では親子会社を一体とみなして作成します。そのため子会社株式を100%保有していない場合、非支配株主分を区別して表示する必要があります。'
  },
  accrue_tax:{
    title:'法人税等の計上',
    why:'当期の課税所得に基づいて法人税等を見積もり、費用として計上します。確定申告前の見積額のため「未払法人税等（負債）」として計上します。費用（法人税等）の発生は「借方」、未払い税金（負債）の発生は「貸方」です。',
    bs:'未払法人税等（流動負債）が増加',
    pl:'法人税等が増加 → 純利益が減少',
    cf:'影響なし（現金未払いのため）',
    tip:'<b>実効税率：</b>「法人税等 ÷ 税引前利益」が実効税率です。法定実効税率（約30%）と乖離がある場合は、税効果会計の適用や特別控除の影響が考えられます。'
  },
  pay_tax:{
    title:'法人税等の支払',
    why:'計上済みの法人税等（未払法人税等）を現金で納付しました。負債（未払法人税等）の消滅は「借方」、現金（資産）の減少は「貸方」です。費用はすでに計上済みなのでPLへの影響はありません。',
    bs:'現金（流動資産）減少・未払法人税等（負債）減少',
    pl:'影響なし（費用は未払計上時に認識済み）',
    cf:'営業活動CF が減少（法人税納付）',
    tip:'<b>中間申告と確定申告：</b>法人税は事業年度終了後の確定申告のほか、年度途中に「中間申告（予定納税）」があります。前期確定税額の半額を中期に先払いします。'
  },
  prepaid_tax:{
    title:'法人税等の中間納税',
    why:'年度途中の中間申告で法人税を前払いしました。年度確定前のため「仮払法人税等（資産）」として計上します。現金（資産）の減少は「貸方」、仮払税金（資産）の増加は「借方」です。',
    bs:'現金（流動資産）減少・仮払法人税等（流動資産）増加',
    pl:'影響なし（前払い・費用未確定）',
    cf:'営業活動CF が減少',
    tip:'<b>予定申告 vs 仮決算申告：</b>中間申告には「前期実績の1/2で納付する予定申告」と「6ヶ月分の仮決算で納付する仮決算申告」があります。当期業績が前期より大幅悪化した場合は仮決算申告が有利です。'
  },
  settle_prepaid:{
    title:'仮払法人税等の精算',
    why:'年度末の確定申告時に、中間納税で支払った「仮払法人税等（資産）」と「未払法人税等（負債）」を相殺整理します。仮払額（資産）の消滅は「貸方」、未払額（負債）の消滅は「借方」です。差額が生じる場合は追加納税または還付となります。',
    bs:'仮払法人税等・未払法人税等が相殺されて消滅',
    pl:'影響なし（精算・相殺のみ）',
    cf:'影響なし（現金の動きなし）',
    tip:'<b>還付申告：</b>中間納税額が確定税額を超えた場合（赤字決算時など）は、超過額の還付申告ができます。資金繰りにとって還付金は重要な収入源になることがあります。'
  },
  deferred_tax_asset:{
    title:'繰延税金資産の計上',
    why:'会計上の費用が税務上は将来にしか認められない場合（将来減算一時差異）、将来節税できる効果を資産として先取り計上します。この「前払い税金」的な性質を「繰延税金資産」といいます。法人税等調整額（PLの税金を減少）は「貸方」です。',
    bs:'繰延税金資産（固定資産）が増加',
    pl:'法人税等調整額（マイナス計上）→ 純利益が増加',
    cf:'影響なし（非現金取引）',
    tip:'<b>回収可能性の評価：</b>繰延税金資産は将来の課税所得が十分でないと回収できません。赤字が続く企業では計上できず、過去に計上したものを取り崩す「評価性引当額の計上」が必要になります。'
  },
  deferred_tax_liability:{
    title:'繰延税金負債の計上',
    why:'会計上は収益になるが税務上は将来に課税される場合（将来加算一時差異）、将来の税金負担を先取りして負債として計上します。法人税等調整額（PLの税金を増加）は「借方」です。',
    bs:'繰延税金負債（固定負債）が増加',
    pl:'法人税等調整額（プラス計上）→ 純利益が減少',
    cf:'影響なし（非現金取引）',
    tip:'<b>税効果会計の目的：</b>会計利益と課税所得の差異から生じる「税金負担のタイムラグ」を調整し、企業の実態に近い税後利益を表示するための仕組みです。'
  },
  valuation_allowance:{
    title:'繰延税金資産の評価性引当額',
    why:'繰延税金資産のうち将来の課税所得不足などにより回収できないと判断される部分を控除します。評価性引当額（繰延税金資産の実質減額）は「貸方」、法人税等調整額（費用増加）は「借方」です。',
    bs:'繰延税金資産が実質的に減少',
    pl:'法人税等調整額（プラス計上）→ 純利益が減少',
    cf:'影響なし（非現金取引）',
    tip:'<b>業績悪化のシグナル：</b>繰延税金資産の評価性引当額が増加している場合、「将来の課税所得が期待できない」という経営判断を意味します。赤字が続く企業の財務分析では必ず確認すべき項目です。'
  },
  ifrs_lease_rou:{
    title:'使用権資産の計上（IFRS16）',
    why:'IFRS16（リース）では、オペレーティングリースも「使用権資産」と「リース負債」としてバランスシートに計上（オンバランス）します。従来は賃貸借料として費用処理していたものが、資産・負債として現れるため財務指標が変わります。',
    bs:'使用権資産（固定資産）増加・リース負債（固定負債）増加',
    pl:'影響なし（計上時は損益に影響しない）',
    cf:'影響なし（非現金取引・後のリース支払で財務CFが変化）',
    tip:'<b>財務指標への影響：</b>IFRS16適用によりD/Eレシオ（負債比率）が上昇し、EBITDAは改善する傾向があります（賃借料がリース費用から減価償却費＋利息に置き換わるため）。'
  },
  ifrs_lease_payment:{
    title:'リース負債の支払',
    why:'リース料の支払いを元本部分と利息部分に分解して処理します。元本部分はリース負債（負債）の返済、利息部分は支払利息（費用）として計上します。日本基準のオペレーティングリースでは全額費用処理でしたが、IFRS16では分解が必要です。',
    bs:'リース負債（固定負債）が元本分だけ減少・使用権資産も減少',
    pl:'支払利息（営業外費用）が増加（利息部分のみ）',
    cf:'財務活動CF が減少（元本＋利息）',
    tip:'<b>日本基準との比較：</b>IFRS16適用後は財務CFの支払が増加し、営業CFが改善して見える企業が多くなりました。セグメントや企業間の比較では分類の違いに注意が必要です。'
  },
  ifrs_revaluation:{
    title:'有形固定資産の再評価（IFRS）',
    why:'IFRSの「再評価モデル」を選択した場合、有形固定資産を公正価値（時価）で評価し直します。価値が上昇した場合は「再評価剰余金（OCI）」として純資産に計上します（PLを通過しない）。日本基準では認められていない処理です。',
    bs:'建物（固定資産）増加・再評価剰余金（純資産OCI）増加',
    pl:'影響なし（PLを経由しないため）',
    cf:'影響なし（非現金取引）',
    tip:'<b>取得原価モデル vs 再評価モデル：</b>IFRSでは資産クラスごとにどちらかを選択して継続適用します。再評価モデルを選ぶと財務諸表が時価に近づきますが、定期的な外部評価が必要でコストがかかります。'
  },
  hedge_instrument:{
    title:'ヘッジ手段の指定（OCI）',
    why:'キャッシュフローヘッジの有効部分の時価変動は、ヘッジ対象の損益が実現するまでOCIに繰り延べます。IFRS9に基づくヘッジ会計を適用することで、ヘッジ手段とヘッジ対象の損益が同じ期に計上され、財務諸表の歪みを防ぎます。',
    bs:'ヘッジ手段資産増加・その他包括利益（OCI）増加',
    pl:'影響なし（有効部分はOCIに繰延べ）',
    cf:'影響なし（評価のみ）',
    tip:'<b>ヘッジ会計の要件：</b>ヘッジ会計の適用には①ヘッジの指定と文書化、②ヘッジの有効性評価（有効率80〜125%など）、③継続的な有効性のモニタリングが必要です。'
  },
  close_period:{
    title:'期末決算締め（損益振替）',
    why:'当期の収益・費用を集計して純利益を確定し、「繰越利益剰余金（純資産）」に振り替えます。この「損益振替」によりPLの各勘定残高がゼロになり新しい期が始まります。利益が蓄積されることで自己資本が増加します。',
    bs:'繰越利益剰余金（純資産）が当期純利益分だけ増加（PL科目リセット）',
    pl:'全PL科目がゼロリセット（翌期の集計開始）',
    cf:'CF各区分がゼロリセット（翌期の集計開始）',
    tip:'<b>損益振替の本質：</b>PLは「フロー計算書」で1年間の収益・費用を集計します。期末に純利益をBSの純資産（繰越利益剰余金）に振り替えることで、ストック（BS）とフロー（PL）がつながります。'
  }
};
var LV_META=[null,
  {name:'Lv.1  入門',     desc:'現金の動き・借方貸方・利益のしくみを体感しましょう。',        color:'#3e7068'},
  {name:'Lv.2  初級',     desc:'掛売買・前払・前受・未払など発生主義会計の基礎。',            color:'#357062'},
  {name:'Lv.3  中級',     desc:'固定資産・減価償却・借入金など BS の複雑な構造を理解。',      color:'#2c5a55'},
  {name:'Lv.4  準上級',   desc:'社債・増資・自己株式・投資有価証券など財務取引の全体像。',    color:'#2a4a7c'},
  {name:'Lv.5  上級',     desc:'のれん・減損・税効果・為替・棚卸評価など高度な会計処理。',    color:'#243f6b'},
  {name:'Lv.6  超上級',   desc:'Lv1〜5 全科目統合。複合取引と連鎖する財務三表の動きを確認。',color:'#1e345a'},
  {name:'Lv.7  エキスパート',desc:'為替・税効果・M&A・引当金の高度な論点を習得。',             color:'#1a2d4e'},
  {name:'Lv.8  プロ',     desc:'収益認識・リース・金融商品・連結会計のプロレベル処理。',      color:'#7a5230'},
  {name:'Lv.9  マスター', desc:'IFRS・持分法・非支配株主・ストックオプションなど国際水準。',  color:'#5a3a22'},
  {name:'Lv.10 総復習',   desc:'Lv1〜9 の全勘定科目・全取引を網羅。財務三表の完全制覇。',    color:'#1a1e2e'}
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
  if(target) target.classList.add('active');
  var meta=LV_META[lv];
  if(meta){
    var bar=document.getElementById('lv-info-bar');
    if(bar){bar.style.background=meta.color;bar.textContent=meta.name+'  —  '+meta.desc;}
  }
  var ds=document.getElementById('lv-select');
  if(ds) ds.value=lv;
}

function resetAll(){
  if(!confirm('全データをリセットしますか？'))return;
  S=MK();txnCount=0;
  setJournal('（取引ボタンを押すと仕訳が表示されます）','');
  document.getElementById('log-list').innerHTML='（取引はここに記録されます）';
  renderAll();
}
function clearLog(){document.getElementById('log-list').innerHTML='（ログを消去しました）';}

// =====================================================
// BUILD PANELS (desktop + mobile drawer)
// =====================================================
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
      ['cash_sales','現金売上','¥5,000'],['credit_sales','掛売上','¥3,000'],
      ['collect_ar','売掛金 回収',''],['interest_income','受取利息 計上','¥500'],
      ['collect_interest','受取利息 受取','']
    ]},
    {title:'仕入・費用',icon:'receipt',btns:[
      ['cash_purchase','現金仕入','¥2,000'],['credit_purchase','掛仕入','¥1,500'],
      ['pay_salary','給与支払','¥1,500'],['pay_interest','支払利息','¥200']
    ]},
    {title:'固定資産',icon:'building-2',btns:[
      ['buy_equipment','設備購入','¥3,000'],['buy_building','建物購入','¥5,000'],
      ['buy_land','土地購入','¥4,000'],['sell_asset','固定資産売却（益）',''],
      ['sell_asset_loss','固定資産売却（損）',''],['depreciation','減価償却費','']
    ]},
    {title:'借入・返済',icon:'credit-card',btns:[
      ['borrow_short','短期借入','¥3,000'],['repay_short','短期返済',''],
      ['borrow_long','長期借入','¥5,000'],['repay_long','長期返済','']
    ]},
    {title:'決算整理',icon:'calendar-check',btns:[
      ['closing_begin_inv','期首商品 → 仕入振替',''],['closing_end_inv','期末商品 → 繰越商品','¥500'],
      ['accrue_bad_debt','貸倒引当金 繰入','¥300'],['accrue_salary','未払費用 計上','¥800'],
      ['prepaid_expense','前払費用 計上','¥600'],['accrue_tax','法人税等 計上','¥1,200'],
      ['close_period','期末決算締め','']
    ]}
  ],
  4:[
    {title:'売上・収益',icon:'trending-up',btns:[
      ['cash_sales','現金売上','¥5,000'],['credit_sales','掛売上','¥3,000'],
      ['collect_ar','売掛金 回収',''],['interest_income','受取利息','¥500'],
      ['dividend_income','受取配当金','¥800']
    ]},
    {title:'仕入・費用',icon:'receipt',btns:[
      ['cash_purchase','現金仕入','¥2,000'],['credit_purchase','掛仕入','¥1,500'],
      ['pay_salary','給与支払','¥1,500'],['rd_expense','研究開発費','¥1,000'],
      ['pay_interest','支払利息','¥200']
    ]},
    {title:'固定資産・投資',icon:'building-2',btns:[
      ['buy_equipment','設備購入','¥3,000'],['depreciation','減価償却費',''],
      ['buy_investment','投資有価証券 取得','¥2,000'],['sell_investment','投資有価証券 売却',''],
      ['invest_valuation_up','有価証券評価益（OCI）','¥500'],['invest_valuation_dn','有価証券評価損',''],
      ['pay_deposit','敷金・保証金 支払','¥1,000']
    ]},
    {title:'財務・資本',icon:'landmark',btns:[
      ['issue_bond','社債発行','¥5,000'],['redeem_bond','社債償還',''],
      ['issue_stock','増資（株式発行）','¥3,000'],['buy_treasury','自己株式 取得','¥1,000'],
      ['cancel_treasury','自己株式 消却',''],['pay_dividend','配当支払','¥500'],
      ['borrow_short','短期借入','¥3,000'],['borrow_long','長期借入','¥5,000']
    ]},
    {title:'決算整理',icon:'calendar-check',btns:[
      ['closing_begin_inv','期首商品 → 仕入振替',''],['closing_end_inv','期末商品 → 繰越商品','¥500'],
      ['accrue_bad_debt','貸倒引当金 繰入','¥300'],['depreciation','減価償却',''],
      ['accrue_retirement','退職給付引当金','¥1,000'],['accrue_tax','法人税等 計上','¥1,200'],
      ['close_period','期末決算締め','']
    ]}
  ],
  5:[
    {title:'売上・収益',icon:'trending-up',btns:[
      ['cash_sales','現金売上','¥5,000'],['credit_sales','掛売上','¥3,000'],
      ['collect_ar','売掛金 回収',''],['fx_gain','為替差益','¥600']
    ]},
    {title:'仕入・費用',icon:'receipt',btns:[
      ['cash_purchase','現金仕入','¥2,000'],['credit_purchase','掛仕入','¥1,500'],
      ['pay_salary','給与支払','¥1,500'],['fx_loss','為替差損','¥400']
    ]},
    {title:'棚卸・評価',icon:'package',btns:[
      ['inventory_loss','棚卸減耗損',''],['inventory_writedown','商品評価損（低価法）',''],
      ['closing_begin_inv','期首商品 → 仕入振替',''],['closing_end_inv','期末商品 → 繰越商品','¥500']
    ]},
    {title:'固定資産',icon:'building-2',btns:[
      ['buy_equipment','設備購入','¥3,000'],['depreciation','減価償却費',''],['impairment','減損損失','']
    ]},
    {title:'決算整理',icon:'calendar-check',btns:[
      ['accrue_bad_debt','貸倒引当金 繰入','¥300'],['accrue_retirement','退職給付引当金','¥1,000'],
      ['accrue_tax','法人税等 計上','¥1,200'],['pay_tax','法人税等 支払',''],
      ['close_period','期末決算締め','']
    ]}
  ],
  6:[
    {title:'売上・収益',icon:'trending-up',btns:[
      ['cash_sales','現金売上','¥5,000'],['credit_sales','掛売上','¥3,000'],
      ['collect_ar','売掛金 回収',''],['interest_income','受取利息','¥500'],
      ['dividend_income','受取配当金','¥800'],['fx_gain','為替差益','¥600']
    ]},
    {title:'費用',icon:'receipt',btns:[
      ['cash_purchase','現金仕入','¥2,000'],['credit_purchase','掛仕入','¥1,500'],
      ['pay_salary','給与支払','¥1,500'],['ad_expense','広告宣伝費','¥500'],
      ['rd_expense','研究開発費','¥1,000'],['pay_interest','支払利息','¥200'],['fx_loss','為替差損','¥400']
    ]},
    {title:'固定資産・のれん',icon:'building-2',btns:[
      ['buy_equipment','設備購入','¥3,000'],['buy_building','建物購入','¥5,000'],
      ['buy_land','土地購入','¥4,000'],['sell_asset','固定資産売却（益）',''],
      ['sell_asset_loss','固定資産売却（損）',''],['depreciation','減価償却費',''],
      ['impairment','減損損失',''],['buy_goodwill','のれん 取得','¥4,000'],
      ['amortize_goodwill','のれん 償却','']
    ]},
    {title:'財務・資本',icon:'landmark',btns:[
      ['borrow_short','短期借入','¥3,000'],['repay_short','短期返済',''],
      ['borrow_long','長期借入','¥5,000'],['repay_long','長期返済',''],
      ['issue_bond','社債発行','¥5,000'],['redeem_bond','社債償還',''],
      ['issue_stock','増資','¥3,000'],['buy_treasury','自己株式 取得','¥1,000'],
      ['pay_dividend','配当支払','¥500']
    ]},
    {title:'決算整理（全）',icon:'calendar-check',btns:[
      ['closing_begin_inv','期首商品 → 仕入振替',''],['closing_end_inv','期末商品 → 繰越商品','¥500'],
      ['accrue_bad_debt','貸倒引当金 繰入','¥300'],['bad_debt_writeoff','貸倒 実際発生',''],
      ['accrue_salary','未払費用 計上','¥800'],['accrue_retirement','退職給付引当金','¥1,000'],
      ['inventory_loss','棚卸減耗損',''],['inventory_writedown','商品評価損',''],
      ['accrue_tax','法人税等 計上','¥1,200'],['pay_tax','法人税等 支払',''],
      ['close_period','期末決算締め','']
    ]}
  ],
  7:[
    {title:'為替・外貨',icon:'globe',btns:[
      ['fx_gain','為替差益','¥600'],['fx_loss','為替差損','¥400'],
      ['fx_translation_adj','換算調整勘定（OCI）','¥300'],
      ['forward_contract_gain','先物為替予約 差益','¥800'],['forward_contract_loss','先物為替予約 差損','¥600']
    ]},
    {title:'税効果・繰延',icon:'percent',btns:[
      ['deferred_tax_asset','繰延税金資産 計上','¥400'],['deferred_tax_liability','繰延税金負債 計上','¥300'],
      ['prepaid_tax','法人税等前払（中間）','¥600'],['settle_prepaid','前払 精算',''],
      ['accrue_tax','法人税等 計上','¥1,200']
    ]},
    {title:'棚卸・評価',icon:'package',btns:[
      ['cash_purchase','現金仕入','¥2,000'],['credit_purchase','掛仕入','¥1,500'],
      ['closing_begin_inv','期首商品 → 仕入振替',''],['closing_end_inv','期末商品 → 繰越商品','¥500'],
      ['inventory_loss','棚卸減耗損',''],['inventory_writedown','商品評価損','']
    ]},
    {title:'資産評価・減損',icon:'layers',btns:[
      ['buy_equipment','設備購入','¥3,000'],['depreciation','減価償却費',''],
      ['impairment','減損損失',''],['buy_goodwill','のれん 取得','¥4,000'],
      ['amortize_goodwill','のれん 償却',''],['invest_valuation_up','有価証券評価益（OCI）','¥500'],
      ['invest_valuation_dn','有価証券評価損','']
    ]},
    {title:'資本・財務',icon:'landmark',btns:[
      ['cash_sales','現金売上','¥5,000'],['credit_sales','掛売上','¥3,000'],
      ['pay_salary','給与支払','¥1,500'],['issue_stock','増資','¥3,000'],
      ['buy_treasury','自己株式 取得','¥1,000'],['cancel_treasury','自己株式 消却',''],
      ['pay_dividend','配当支払','¥500'],['issue_bond','社債発行','¥5,000'],['redeem_bond','社債償還','']
    ]},
    {title:'決算整理',icon:'calendar-check',btns:[
      ['accrue_bad_debt','貸倒引当金 繰入','¥300'],['accrue_retirement','退職給付引当金','¥1,000'],
      ['accrue_salary','未払費用 計上','¥800'],['pay_tax','法人税等 支払',''],
      ['close_period','期末決算締め','']
    ]}
  ],
  8:[
    {title:'高度収益認識',icon:'trending-up',btns:[
      ['cash_sales','現金売上','¥5,000'],['credit_sales','掛売上（IFRS15）','¥3,000'],
      ['collect_ar','売掛金 回収',''],['receive_advance','前受金（長期契約）','¥2,000'],
      ['advance_to_sales','前受金 → 売上振替',''],['interest_income','受取利息','¥500'],
      ['dividend_income','受取配当金','¥800'],['fx_gain','為替差益','¥600']
    ]},
    {title:'引当金・準備金',icon:'shield',btns:[
      ['accrue_bad_debt','貸倒引当金 繰入','¥300'],['bad_debt_writeoff','貸倒 実際発生',''],
      ['accrue_retirement','退職給付引当金','¥1,000'],['pay_retirement','退職給付 支払',''],
      ['warranty_provision','製品保証引当金','¥500'],['restructuring_provision','リストラ引当金','¥2,000']
    ]},
    {title:'M&A・連結',icon:'git-merge',btns:[
      ['buy_goodwill','のれん 取得（M&A）','¥4,000'],['amortize_goodwill','のれん 償却',''],
      ['impairment','のれん 減損',''],['buy_investment','子会社・関連会社株式 取得','¥2,000'],
      ['sell_investment','投資有価証券 売却',''],['equity_method_income','持分法投資利益','¥1,000'],
      ['equity_method_loss','持分法投資損失','']
    ]},
    {title:'リース・金融商品',icon:'home',btns:[
      ['ifrs_lease_rou','使用権資産 計上（IFRS16）','¥3,000'],['ifrs_lease_payment','リース負債 支払',''],
      ['hedge_instrument','ヘッジ手段 指定（OCI）','¥200'],['fx_translation_adj','換算調整勘定','¥300']
    ]},
    {title:'税効果・繰延',icon:'percent',btns:[
      ['deferred_tax_asset','繰延税金資産','¥400'],['deferred_tax_liability','繰延税金負債','¥300'],
      ['accrue_tax','法人税等 計上','¥1,200'],['pay_tax','法人税等 支払','']
    ]},
    {title:'資本政策',icon:'landmark',btns:[
      ['issue_stock','増資（第三者割当）','¥3,000'],['buy_treasury','自己株式 取得','¥1,000'],
      ['cancel_treasury','自己株式 消却',''],['pay_dividend','配当支払','¥500'],
      ['issue_bond','社債発行','¥5,000'],['redeem_bond','社債償還','']
    ]},
    {title:'決算整理',icon:'calendar-check',btns:[
      ['closing_begin_inv','期首商品 → 仕入振替',''],['closing_end_inv','期末商品 → 繰越商品','¥500'],
      ['inventory_loss','棚卸減耗損',''],['inventory_writedown','商品評価損',''],
      ['depreciation','減価償却',''],['accrue_salary','未払費用 計上','¥800'],
      ['prepaid_expense','前払費用 計上','¥600'],['close_period','期末決算締め','']
    ]}
  ],
  9:[
    {title:'国際会計（IFRS）',icon:'globe',btns:[
      ['cash_sales','現金売上（IFRS 5段階）','¥5,000'],['credit_sales','掛売上','¥3,000'],
      ['ifrs_lease_rou','使用権資産 計上（IFRS16）','¥3,000'],['ifrs_lease_payment','リース負債 支払',''],
      ['ifrs_revaluation','有形固定資産 再評価','¥1,000'],['fx_translation_adj','換算調整勘定','¥300'],
      ['forward_contract_gain','先物差益','¥800'],['forward_contract_loss','先物差損','¥600']
    ]},
    {title:'高度税効果',icon:'percent',btns:[
      ['deferred_tax_asset','繰延税金資産','¥400'],['deferred_tax_liability','繰延税金負債','¥300'],
      ['valuation_allowance','評価性引当額（回収不能）',''],['accrue_tax','法人税等 計上','¥1,200'],
      ['pay_tax','法人税等 支払','']
    ]},
    {title:'連結・持分法',icon:'git-merge',btns:[
      ['buy_goodwill','のれん（パーチェス法）','¥4,000'],['impairment','のれん減損（IFRS）',''],
      ['equity_method_income','持分法投資利益','¥1,000'],['equity_method_loss','持分法投資損失',''],
      ['minority_interest','非支配株主持分','¥1,000'],['buy_investment','関連会社株式 取得','¥2,000']
    ]},
    {title:'複雑な資本取引',icon:'landmark',btns:[
      ['issue_stock','新株予約権付社債','¥3,000'],['stock_option','ストックオプション 費用化','¥300'],
      ['buy_treasury','自己株式 取得','¥1,000'],['cancel_treasury','自己株式 消却',''],
      ['pay_dividend','配当支払','¥500'],['oci_item','その他包括利益（OCI）','¥500']
    ]},
    {title:'決算整理',icon:'calendar-check',btns:[
      ['closing_begin_inv','期首商品 → 仕入振替',''],['closing_end_inv','期末商品 → 繰越商品','¥500'],
      ['inventory_loss','棚卸減耗損',''],['inventory_writedown','商品評価損',''],
      ['depreciation','減価償却',''],['amortize_goodwill','のれん 償却',''],
      ['accrue_retirement','退職給付引当金','¥1,000'],['warranty_provision','製品保証引当金','¥500'],
      ['accrue_salary','未払費用 計上','¥800'],['accrue_bad_debt','貸倒引当金 繰入','¥300'],
      ['close_period','期末決算締め','']
    ]}
  ],
  10:[
    {title:'売上・収益【全】',icon:'trending-up',btns:[
      ['cash_sales','現金売上','¥5,000'],['credit_sales','掛売上','¥3,000'],
      ['collect_ar','売掛金 回収',''],['receive_advance','前受金 受取','¥2,000'],
      ['advance_to_sales','前受金 → 売上',''],['interest_income','受取利息','¥500'],
      ['collect_interest','受取利息 受取',''],['dividend_income','受取配当金','¥800'],
      ['fx_gain','為替差益','¥600'],['equity_method_income','持分法投資利益','¥1,000']
    ]},
    {title:'仕入・費用【全】',icon:'receipt',btns:[
      ['cash_purchase','現金仕入','¥2,000'],['credit_purchase','掛仕入','¥1,500'],
      ['pay_ap','買掛金 支払',''],['pay_salary','給与支払','¥1,500'],
      ['accrue_salary','未払費用 計上','¥800'],['pay_accrued','未払費用 支払',''],
      ['ad_expense','広告宣伝費','¥500'],['rd_expense','研究開発費','¥1,000'],
      ['pay_interest','支払利息','¥200'],['fx_loss','為替差損','¥400'],
      ['equity_method_loss','持分法投資損失',''],['warranty_provision','製品保証引当金','¥500'],
      ['restructuring_provision','リストラ引当金','¥2,000']
    ]},
    {title:'前払・仮払',icon:'clock',btns:[
      ['prepay_advance','仮払金 支払','¥300'],['settle_advance','仮払金 精算',''],
      ['prepaid_expense','前払費用 計上','¥600'],['expense_prepaid','前払費用 → 費用振替','']
    ]},
    {title:'棚卸・評価【全】',icon:'package',btns:[
      ['closing_begin_inv','期首商品 → 仕入振替',''],['closing_end_inv','期末商品 → 繰越商品','¥500'],
      ['inventory_loss','棚卸減耗損',''],['inventory_writedown','商品評価損','']
    ]},
    {title:'固定資産【全】',icon:'building-2',btns:[
      ['buy_equipment','設備購入','¥3,000'],['buy_building','建物購入','¥5,000'],
      ['buy_land','土地購入','¥4,000'],['sell_asset','固定資産売却（益）',''],
      ['sell_asset_loss','固定資産売却（損）',''],['depreciation','減価償却費',''],
      ['impairment','減損損失',''],['buy_goodwill','のれん 取得','¥4,000'],
      ['amortize_goodwill','のれん 償却',''],['pay_deposit','敷金・保証金 支払','¥1,000'],
      ['ifrs_lease_rou','使用権資産 計上','¥3,000'],['ifrs_revaluation','固定資産再評価（IFRS）','¥1,000']
    ]},
    {title:'投資有価証券【全】',icon:'bar-chart-2',btns:[
      ['buy_investment','投資有価証券 取得','¥2,000'],['sell_investment','投資有価証券 売却',''],
      ['invest_valuation_up','有価証券評価益（OCI）','¥500'],['invest_valuation_dn','有価証券評価損','']
    ]},
    {title:'借入・社債【全】',icon:'credit-card',btns:[
      ['borrow_short','短期借入','¥3,000'],['repay_short','短期返済',''],
      ['borrow_long','長期借入','¥5,000'],['repay_long','長期返済',''],
      ['issue_bond','社債発行','¥5,000'],['redeem_bond','社債償還',''],
      ['short_loan_out','短期貸付 実行','¥1,000'],['collect_loan_out','短期貸付 回収','']
    ]},
    {title:'資本政策【全】',icon:'landmark',btns:[
      ['issue_stock','増資','¥3,000'],['buy_treasury','自己株式 取得','¥1,000'],
      ['cancel_treasury','自己株式 消却',''],['pay_dividend','配当支払','¥500'],
      ['stock_option','ストックオプション','¥300'],['oci_item','その他包括利益（OCI）','¥500'],
      ['minority_interest','非支配株主持分','¥1,000']
    ]},
    {title:'高度・国際【全】',icon:'globe',btns:[
      ['fx_translation_adj','換算調整勘定','¥300'],['forward_contract_gain','先物差益','¥800'],
      ['forward_contract_loss','先物差損','¥600'],['deferred_tax_asset','繰延税金資産','¥400'],
      ['deferred_tax_liability','繰延税金負債','¥300'],['valuation_allowance','評価性引当額',''],
      ['ifrs_lease_payment','リース負債 支払',''],['hedge_instrument','ヘッジ手段 指定','¥200']
    ]},
    {title:'決算整理【全】',icon:'calendar-check',btns:[
      ['accrue_bad_debt','貸倒引当金 繰入','¥300'],['bad_debt_writeoff','貸倒 実際発生',''],
      ['accrue_retirement','退職給付引当金','¥1,000'],['pay_retirement','退職給付 支払',''],
      ['accrue_tax','法人税等 計上','¥1,200'],['pay_tax','法人税等 支払',''],
      ['prepaid_tax','法人税等前払','¥600'],['settle_prepaid','前払 精算',''],
      ['close_period','期末決算締め','']
    ]}
  ]
};

function buildPanelHTML(secs,prefix){
  var html='';
  for(var i=0;i<secs.length;i++){
    var sec=secs[i];
    html+='<div class="btn-section">'
         +'<div class="btn-section-title"><i data-lucide="'+(sec.icon||'circle')+'"></i>'+sec.title+'</div>';
    for(var j=0;j<sec.btns.length;j++){
      var b=sec.btns[j];
      html+='<button class="txn-btn" onclick="go(\''+b[0]+'\')">'
           +'<span>'+b[1]+'</span>'
           +(b[2]?'<span class="amt">'+b[2]+'</span>':'')
           +'</button>';
    }
    html+='</div>';
  }
  return html;
}

function buildPanels(){
  // Desktop sidebar only
  var deskContainer=document.getElementById('panels-container');

  for(var lv=1;lv<=10;lv++){
    var secs=PANELS[lv]||[];
    var html=buildPanelHTML(secs,'desk');

    if(deskContainer){
      var pDiv=document.createElement('div');
      pDiv.className='lv-panel'+(lv===1?' active':'');
      pDiv.id='panel-'+lv;
      pDiv.innerHTML=html;
      deskContainer.appendChild(pDiv);
    }
  }

  if(typeof lucide!=='undefined') lucide.createIcons();
}

// =====================================================
// INIT
// =====================================================
buildPanels();
switchLevel(1);
renderAll();
