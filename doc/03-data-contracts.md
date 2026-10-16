# データ契約

本書は完成時に実装するデータの契約です。以下の名前は仕様上のフィールド名です。Phase 1初版の型と検証器は `src/core/types.ts` と `src/core/validation.ts` にありますが、本書のすべてを実装済みという意味ではありません。対応範囲と未対応部分は [実装状況](foundation-status.md) を参照してください。

## 1. 共通規則

人物IDは `C001`〜`C100`、主人公は `player`、犬は `animal.dog.nora` とし、名前空間 `redesign-v1` を保存データに含めます。場所は `loc.*`、物品種類は `item.*`、現物は `obj.*`、行為定義は `act.*`、共同場面は `scene.*`、命題は `prop.*`、サービスは `service.*` を用います。表示名や配列順を参照キーにしません。

時刻は非負整数の `tick`、所要時間は整数の `durationTicks`、日内時刻は `tick % ticksPerDay` で扱います。個数は整数、量はグラム等の定めた最小単位の整数に統一し、単位の異なる数量を足しません。座標は場所IDとその場所内の座標を組にします。移動中は経路・区間・進行率を持ちます。

原文に未記載の値をデータ化する際は `designStatus: provisional` と根拠を付けます。全参照の存在、ID重複、未定義の分岐、負の数量、終了不能な行為をビルド時に検出します。未知の条件演算子や効果を黙って無視しません。

## 2. 人物定義 ResidentDefinition

`id`、`displayName`、`lifeSceneId`、`sourceRef`、`normalLife`、`goal`、`goalEvidence`、`priorities`、`initialBeliefs`、`ruleIds`、`scheduleIds`、`affordances`、`clueIds`、`routeIds`、`postGoalContract` を持ちます。

`goal` は本人が実現したい生活、`goalEvidence` は世界で起きたと確認する出来事です。`routeIds` は選択可能な方法で、すべてをAND条件にしません。`postGoalContract` は残す物、返却先、記録、通常サービス、既に合意した役、退場条件を含みます。

人物ランタイムは `location`、`presence`、`beliefs`、`acceptedAgreementVersions`、`currentPlan`、`activeActionIds`、`hands`、`inventory`、`routineMode`、`completionEventId` を持ちます。出現状態、主人公による発見状態、達成状態を一つの列挙値に押し込みません。赤ん坊C020は観測可能な身体反応と保護者の確認で記述し、成人のような信念・計画の必須入力を要求しません。

## 3. 命題・認識・観測

命題は `id`、`subject`、`predicate`、`object`、必要なら `validInterval` を持つ内容です。命題が真であることと、誰かがそれを信じていることは別です。

認識は `propositionId`、`stance`（信じる・否定・未確定）、`sourceKind`（目撃・伝聞・推論・初期記憶）、`sourceActorId` または `sourceObjectId`、`evidenceEventIds`、`acquiredAt`、`revisionReason` を持ちます。未取得と否定を区別します。確信度の数値は初期実装では必須にしません。

観測イベントは `observerId`、`eventId` または `observedObjectState`、`channel`、`location`、`tick` を持ちます。会話での伝達は `speakerId`、`recipientId`、`propositionId`、`deliveryStatus`、`responseEventId` を持ちます。世界が変わっても認識は自動同期せず、後の観測で古さや矛盾に気づきます。

主人公の手帳は取得した観測・伝聞・推測の投影です。内部の世界状態をそのままシリアライズして表示しません。

## 4. 条件式と効果

条件式は構造化データとし、`all`、`any`、`not` と、場所、所持、数量、物理状態、認識、合意版、行為中、予約、時刻区間、出来事履歴を調べる型付き演算子で記述します。任意のJavaScript文字列を実行する `eval` は使いません。

住民の `choiceGuard` はその住民の認識・現在の観測・優先順位だけを参照します。エンジンの `startGuard`、`maintainGuard`、`finishGuard` は物理的な世界状態を検査できます。達成履歴への依存は原則として診断し、具体的な物・知識・実行証拠で表せない理由を明記させます。

効果は移動完了、物の移転、数量消費、設備状態変更、発言、合意応答、観測生成、達成記録、サービス移行を型として持ちます。住民の認識を変える効果には、その人物へ情報が届いたイベントまたは正当な初期記憶を要求します。

## 5. 行為 ActionDefinition / ActionInstance

定義は `id`、`actorSelector`、`locationConstraint`、`choiceGuard`、`startGuard`、`maintainGuard`、`finishGuard`、`durationTicks`、`reservations`、`consumption`、`onSuccess`、`onAbort`、`recoveryActionId`、`presentationId` を持ちます。

実行中のインスタンスは `instanceId`、`definitionId`、`actorIds`、`startedAt`、`elapsedTicks`、`phase`、`reservedResources`、`appliedEffectIds`、`abortReason` を持ちます。定義IDと実行回を分け、読込後に同じ消費や受渡しを再実行しません。中断から終了まで複数段階かかる場合、`recovering` を実行中として保存します。

## 6. 物・数量・借用

物品定義は `typeId`、`displayName`、`portable`、`handRequirement`、`unit`、`usableActions`、`consumable` を持ちます。現物は `objectId`、`typeId`、`ownerId`、`custody`、`quantity`、`condition`、`reservationIds` を持ちます。

`custody` は人物所持、場所に配置、容器内、設備に組込み、消費済みのいずれか一つです。積重ね可能な品も分割・併合の履歴を保持し、別用途に予約した分を取り違えません。C034の乾いた予備布、乾燥中の寝具、C051の見本布、幕用の布は別の現物または数量割当です。

借用記録は `loanId`、`objectId`、`lenderId`、`borrowerId`、`returnDestination`、`acceptedReturnPolicy`、`status` を持ちます。返却口が確定した場合、貸主本人が不在でも返せます。代案へ切り替えた時に借用記録を消さず、返却・引継ぎを行います。

## 7. 約束と共同場面

約束は `agreementId`、`version`、`subject`、`participantIds`、`terms`、`acceptedBy`、`validity`、`cancellationPolicy` を持ちます。`acceptedBy` は人物ごとの受諾イベントへの参照です。案内を掲示しただけで全員の受諾を埋めません。

共同場面定義は `id`、`kind`（同席・同時作用・置換）、`participants`、`roles`、`entryGuards`、`phases`、`maintainGuards`、`resourceReservations`、`signals`、`abortPolicy`、`recoveryPhases`、`completionEvents` を持ちます。参加者の一部が達成済みでも、合意済みの通常役なら参加できます。

複数人の達成は `completionEvents` ごとに対象を明記します。迎えC065/C066のような共通の完了は同一トランザクション、運河や工場のように時点が違う達成は別イベントです。

## 8. 地図と手掛かり

場所定義は `id`、`bounds`、`walkableAreas`、`portals`、`occluders`、`soundLinks`、`interactionAnchors`、`waitingAreas`、`resourceSlots` を持ちます。ポータルには通行条件、移動時間、両方向の接続を指定します。地図の二次元座標は維持し、画面上の位置と論理上の隣接を混同しません。

手掛かりは `id`、`sourceEntityId`、`visibilityGuard`、`observationChannel`、`description`、`supportsPropositionIds`、`presentationId` を持ちます。ここでの推論支援は作者用です。未発見の `supportsPropositionIds` を手帳に正解として出しません。

## 9. 出来事と達成履歴

出来事は `eventId`、`tick`、`type`、`actorIds`、`subjectIds`、`locationId`、`payload`、`causalEventIds` を持ちます。達成履歴は人物IDをキーに `goalVersion`、`eventId`、`achievedAt`、`evidenceEventIds`、`postGoalContractVersion` を保持します。履歴は取消しません。

主人公による達成確認は別の `knownCompletion` 記録です。内部の達成人数と、主人公が知る人数は一致しない場合があります。結末の世界条件には前者、通常の手帳表示には後者を使います。

## 10. 保存契約

保存データには `schemaVersion`、`contentVersion`、`designNamespace`、`savedAt`、`tick`、乱数状態、世界の全現物、全住民、主人公、認識、約束、共同場面、実行中行為、予約、配送待ち情報、達成履歴、手帳、サービス状態、次の採番値を含めます。

保存は更新の確定境界で作ります。共同作業中の要求も次の確定境界で保存し、現在段階・必要な予約・復旧中かどうかを復元します。自動保存は達成、主要な受渡し、場所移動等の確定後に行い、直前の正常版を残します。手動保存は複数枠とし、初期実装は3枠、自動保存は2世代を候補とします。

読込は一時領域へ展開し、版・必須項目・参照・数量・予約・物の一意性を検査してから現在状態と入れ替えます。失敗時は現在のプレイを壊さず、理由を表示します。未知の新しい版は拒否し、既知の古い版は明示的な移行処理を通します。旧案の人物番号を再設計版へ自動対応させません。

実時間の経過をゲーム時刻へ補完しません。JSONの書き出し・読み込みを用意し、ブラウザ保存が使えない場合も、保存できたと虚偽表示しません。保存処理が未実装の段階では「続きから」を動作しているように見せません。
