import { useFeeds } from '@renderer/lib/feeds'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@renderer/components/ui/collapsible'
import { m, AnimatePresence, useSpring } from 'framer-motion'
import { useState } from 'react'

export function FeedList({ type }: { type: string }) {
  const feeds = useFeeds()

  const categories = {}
  feeds.data?.forEach((feed) => {
    if (!categories[feed.category.title]) {
      categories[feed.category.title] = []
    }
    categories[feed.category.title].push(feed)
  })
  console.log('categories', categories)

  return (
    <div className="w-80 px-4">
      <div className="font-bold my-2">{type}</div>
      {Object.keys(categories).map((category) => (
        <FeedCategory key={category} name={category} list={categories[category]} />
      ))}
    </div>
  )
}

function FeedCategory({ name, list }: { name: string; list: any[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible
      open={open}
      onOpenChange={(o) => setOpen(o)}
    >
      <CollapsibleTrigger className="flex items-center text-[15px] font-medium leading-loose py-[1px] w-full [&>i]:data-[state=open]:rotate-90">
        <i className="i-mingcute-right-fill mr-2 transition-transform" />
        <span>{name}</span>
      </CollapsibleTrigger>
      <AnimatePresence>
        {open && (
          <m.div
            key={name}
            className="overflow-hidden"
            initial={{
              height: 0,
              opacity: 0
            }}
            animate={{
              height: 'auto',
              opacity: 1
            }}
            exit={{
              height: 0,
              opacity: 0
            }}
          >
            {list.map((feed) => (
              <div
                key={feed.id}
                className="flex items-center my-2 text-sm font-medium leading-loose w-full pl-6"
              >
                <img
                  src={`https://icons.duckduckgo.com/ip3/${new URL(feed.site_url).host}.ico`}
                  className="w-4 h-4 mr-2 rounded-sm"
                />
                <div>{feed.title}</div>
              </div>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </Collapsible>
  )
}
