import { useState } from 'react'
import './ShopScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { SHOP_ITEMS, SHOP_KIND_LABEL } from '../data/shop'
import { PixelArt } from '../components/PixelArt'
import type { ShopItemKind } from '../data/types'

const KINDS: ShopItemKind[] = ['weapon', 'armor', 'food', 'medicine']

export function ShopScreen() {
  const { viewerId, gmReveal, coins, shopOpen, setShopOpen, buyItem, giftItem, displayName } = useGame()
  const [kind, setKind] = useState<ShopItemKind>('weapon')
  const [giftTargetFor, setGiftTargetFor] = useState<string | null>(null)

  const otherCharacters = CHARACTERS.filter((c) => c.id !== viewerId)
  const items = SHOP_ITEMS.filter((item) => item.kind === kind)

  return (
    <div className="shop">
      <div className="shop__pin">
        <span className="shop__pin-title">매점</span>
        <span className="shop__coins">코인 {coins}</span>
      </div>

      {gmReveal && (
        <div className="shop__gm">
          <span>매점 상태: {shopOpen ? '열림' : '닫힘'}</span>
          <button className="shop__gm-toggle" onClick={() => setShopOpen(!shopOpen)}>
            {shopOpen ? '닫기' : '열기'}
          </button>
        </div>
      )}

      {!shopOpen && !gmReveal && (
        <p className="shop__closed">매점이 아직 열리지 않았다.</p>
      )}

      {(shopOpen || gmReveal) && (
        <>
          <div className="shop__tabs">
            {KINDS.map((k) => (
              <button key={k} className={`shop__tab ${kind === k ? 'is-active' : ''}`} onClick={() => setKind(k)}>
                {SHOP_KIND_LABEL[k]}
              </button>
            ))}
          </div>

          <div className="shop__list">
            {items.map((item) => (
              <div key={item.id} className="shop__item">
                <PixelArt pixels={item.art.pixels} palette={item.art.palette} size={44} />
                <div className="shop__item-body">
                  <span className="shop__item-name">{item.name}</span>
                  <span className="shop__item-effect">
                    {item.kind === 'weapon' && `공격력 +${item.amount}`}
                    {item.kind === 'armor' && `방어력 +${item.amount}`}
                    {item.kind === 'food' && `스태미나 +${item.amount}`}
                    {item.kind === 'medicine' && `HP +${item.amount}`}
                    {' · '}
                    {item.price} 코인
                  </span>
                  <div className="shop__item-actions">
                    <button disabled={!shopOpen || coins < item.price} onClick={() => buyItem(item.id)}>
                      구매
                    </button>
                    <button
                      disabled={!shopOpen || coins < item.price}
                      onClick={() => setGiftTargetFor(giftTargetFor === item.id ? null : item.id)}
                    >
                      선물
                    </button>
                  </div>
                  {giftTargetFor === item.id && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (!e.target.value) return
                        giftItem(item.id, e.target.value)
                        setGiftTargetFor(null)
                      }}
                    >
                      <option value="">받을 사람 선택</option>
                      {otherCharacters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {displayName(c.id)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
