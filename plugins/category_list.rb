# encoding: utf-8

module Jekyll

  class CategoryList < Liquid::Tag

    def initialize(tag_name, markup, tokens)   
      @opts = {}
      if markup.strip =~ /\s*counter:(\w+)/iu
        @opts['counter'] = ($1 == 'true')
        markup = markup.strip.sub(/counter:\w+/iu,'')
      end
      super
    end

    def render(context)
      html = ""
      config = context.registers[:site].config
      category_dir = config['root'] + config['category_dir'] + '/'
      categories = context.registers[:site].categories
      categories.keys.sort_by{ |str| str.downcase }.each do |category|
        url = category_dir + category.gsub(/_|\P{Word}/u, '-').gsub(/-{2,}/u, '-').gsub('ą','a').gsub('ć','c').gsub('ę','e').gsub('ł','l').gsub('ń','n').gsub('ó','o').gsub('ś','s').gsub('ź','z').gsub('ż','z').downcase + "/"
        html << "<a class='list-group-item' href='#{url}'>#{category}"
        if @opts['counter']
          html << "<span class='badge'>#{categories[category].count}</span>"
        end
        html << "</a>"
      end
      html
    end
  end

end

Liquid::Template.register_tag('category_list', Jekyll::CategoryList)