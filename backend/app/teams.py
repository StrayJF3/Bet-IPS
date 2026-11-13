"""Las 48 selecciones clasificadas al Mundial 2026.

`dataset` es el nombre exacto que usa el historico de resultados
(Data/results.csv) y `flag` el codigo del paquete flag-icons.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Team:
    id: str
    name: str
    dataset: str
    flag: str
    confederation: str
    host: bool = False


TEAMS: tuple[Team, ...] = (
    # Anfitriones (CONCACAF)
    Team("canada", "Canadá", "Canada", "ca", "CONCACAF", host=True),
    Team("mexico", "México", "Mexico", "mx", "CONCACAF", host=True),
    Team("estados-unidos", "Estados Unidos", "United States", "us", "CONCACAF", host=True),
    # CONCACAF
    Team("curazao", "Curazao", "Curaçao", "cw", "CONCACAF"),
    Team("haiti", "Haití", "Haiti", "ht", "CONCACAF"),
    Team("panama", "Panamá", "Panama", "pa", "CONCACAF"),
    # CONMEBOL
    Team("argentina", "Argentina", "Argentina", "ar", "CONMEBOL"),
    Team("brasil", "Brasil", "Brazil", "br", "CONMEBOL"),
    Team("colombia", "Colombia", "Colombia", "co", "CONMEBOL"),
    Team("ecuador", "Ecuador", "Ecuador", "ec", "CONMEBOL"),
    Team("paraguay", "Paraguay", "Paraguay", "py", "CONMEBOL"),
    Team("uruguay", "Uruguay", "Uruguay", "uy", "CONMEBOL"),
    # UEFA
    Team("alemania", "Alemania", "Germany", "de", "UEFA"),
    Team("austria", "Austria", "Austria", "at", "UEFA"),
    Team("belgica", "Bélgica", "Belgium", "be", "UEFA"),
    Team("bosnia", "Bosnia y Herzegovina", "Bosnia and Herzegovina", "ba", "UEFA"),
    Team("chequia", "Chequia", "Czech Republic", "cz", "UEFA"),
    Team("croacia", "Croacia", "Croatia", "hr", "UEFA"),
    Team("escocia", "Escocia", "Scotland", "gb-sct", "UEFA"),
    Team("espana", "España", "Spain", "es", "UEFA"),
    Team("francia", "Francia", "France", "fr", "UEFA"),
    Team("inglaterra", "Inglaterra", "England", "gb-eng", "UEFA"),
    Team("noruega", "Noruega", "Norway", "no", "UEFA"),
    Team("paises-bajos", "Países Bajos", "Netherlands", "nl", "UEFA"),
    Team("portugal", "Portugal", "Portugal", "pt", "UEFA"),
    Team("suecia", "Suecia", "Sweden", "se", "UEFA"),
    Team("suiza", "Suiza", "Switzerland", "ch", "UEFA"),
    Team("turquia", "Turquía", "Turkey", "tr", "UEFA"),
    # CAF
    Team("argelia", "Argelia", "Algeria", "dz", "CAF"),
    Team("cabo-verde", "Cabo Verde", "Cape Verde", "cv", "CAF"),
    Team("costa-de-marfil", "Costa de Marfil", "Ivory Coast", "ci", "CAF"),
    Team("egipto", "Egipto", "Egypt", "eg", "CAF"),
    Team("ghana", "Ghana", "Ghana", "gh", "CAF"),
    Team("marruecos", "Marruecos", "Morocco", "ma", "CAF"),
    Team("rd-congo", "RD Congo", "DR Congo", "cd", "CAF"),
    Team("senegal", "Senegal", "Senegal", "sn", "CAF"),
    Team("sudafrica", "Sudáfrica", "South Africa", "za", "CAF"),
    Team("tunez", "Túnez", "Tunisia", "tn", "CAF"),
    # AFC
    Team("arabia-saudita", "Arabia Saudita", "Saudi Arabia", "sa", "AFC"),
    Team("australia", "Australia", "Australia", "au", "AFC"),
    Team("catar", "Catar", "Qatar", "qa", "AFC"),
    Team("corea-del-sur", "Corea del Sur", "South Korea", "kr", "AFC"),
    Team("irak", "Irak", "Iraq", "iq", "AFC"),
    Team("iran", "Irán", "Iran", "ir", "AFC"),
    Team("japon", "Japón", "Japan", "jp", "AFC"),
    Team("jordania", "Jordania", "Jordan", "jo", "AFC"),
    Team("uzbekistan", "Uzbekistán", "Uzbekistan", "uz", "AFC"),
    # OFC
    Team("nueva-zelanda", "Nueva Zelanda", "New Zealand", "nz", "OFC"),
)

TEAMS_BY_ID: dict[str, Team] = {t.id: t for t in TEAMS}

assert len(TEAMS) == 48 and len(TEAMS_BY_ID) == 48
