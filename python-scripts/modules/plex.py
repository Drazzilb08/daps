import xml.etree.ElementTree as ET
import requests

class PlexInstance:
    def __init__(self, url, api_key, logger):
        self.url = url
        self.api_key = api_key
        self.logger = logger

    def get_collections(self, library_names):
        if isinstance(library_names, str):
            library_names = [library_names]  # Convert to list with a single element
    
        try:
            response = requests.get(f"{self.url}/library/sections", headers={
                "X-Plex-api_key": self.api_key
            })
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            self.logger.error("An error occurred while getting the libraries:", e)
            return []
        
        try:
            xml_root = ET.fromstring(response.content)
        except ET.ParseError as e:
            self.logger.error("An error occurred while parsing the response:", e)
            return []
        
        libraries = xml_root.findall(".//Directory[@type='movie']")
        collections = set()
        
        for library_name in library_names:
            target_library = None
            for library in libraries:
                if library.get("title") == library_name:
                    target_library = library
                    break
            if target_library is None:
                self.logger.error(f"Library with name {library_name} not found")
                continue
            library_id = target_library.get("key")
            
            try:
                response = requests.get(f"{self.url}/library/sections/{library_id}/collections", headers={
                    "X-Plex-api_key": self.api_key
                })
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                self.logger.error("An error occurred while getting the collections:", e)
                continue
            
            try:
                xml_root = ET.fromstring(response.content)
            except ET.ParseError as e:
                self.logger.error("An error occurred while parsing the response:", e)
                continue
            
            library_collections = xml_root.findall(".//Directory")
            library_collection_names = [collection.get("title") for collection in library_collections if collection.get("smart") != "1"]
            
            for collection_name in library_collection_names:
                if collection_name not in collections:
                    collections.add(collection_name)
        return collections