from base import Input
from wapiti import get_json

class Watchers(Input):
    prefix = 'wa'
    
    def fetch(self):
    	result = get_json('http://ortelius.toolserver.org:8089/wl?title=' + self.page_title.replace(' ', '_'))
        return result

    stats = {
        'count': lambda f_res: f_res.get('watchers'),
    }
