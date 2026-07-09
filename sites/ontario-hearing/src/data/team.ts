// Current audiologist team — single source of truth for the team grid,
// individual audiologist pages, and the "other team" cross-links.
export interface Audiologist {
  slug: string;
  name: string;
  role: string;
  credentials: string;
  photo: string;
  metaTitle: string;
  metaDescription: string;
  // Bio as markdown (rendered with marked on the individual page)
  bio: string;
}

export const team: Audiologist[] = [
  {
    slug: "dr-adam-sheppard",
    name: "Dr. Adam Sheppard",
    role: "Practice Lead",
    credentials: "Au.D., Ph.D., F-AAA",
    photo: "/assets/dr-adam.webp",
    metaTitle: "Dr. Adam Sheppard, Au.D., Ph.D. | Ontario Hearing Center, Rochester NY",
    metaDescription:
      "Meet Dr. Adam Sheppard, Au.D., Ph.D., Practice Lead at Ontario Hearing Center in Rochester, NY. He is a premier specialist in cochlear implants and audiology.",
    bio: `**_Dr. Adam Sheppard, Au.D., Ph.D., F-AAA, leads Ontario Hearing Center in Rochester, NY — bridging research, teaching, and clinical practice._**

Every patient at Ontario Hearing Center is seen by a doctoral-level audiologist. No rushed appointments. No one-size-fits-all recommendations. Just careful diagnosis, honest guidance, and treatment plans built around the sounds and experiences that matter most in your life.

That standard starts at the top. Dr. Sheppard holds both a Doctor of Audiology and a Ph.D. in auditory neuroscience from the University at Buffalo, served on the faculty of UB's Doctor of Audiology program, and has authored more than 20 peer-reviewed publications on how the brain processes sound. He has also spent years supporting surgeons and audiologists on cochlear implant procedures throughout Upstate New York.

We've watched hearing technology evolve for decades, and we've evolved with it. What hasn't changed is our commitment to unhurried, personalized care — from a team with the credentials and experience to deliver the best possible outcomes.

#### Education Info

- Doctor of Audiology (Au.D.), University at Buffalo
- Ph.D. in Auditory Neuroscience, University at Buffalo
- Fellow, American Academy of Audiology (F-AAA)
- Cochlear implant evaluation and mapping specialist`,
  },
  {
    slug: "dr-andrea-segmond",
    name: "Dr. Andrea Segmond",
    role: "Audiologist",
    credentials: "Au.D.",
    photo: "/assets/dr-andrea-segmond.webp",
    metaTitle: "Andrea Segmond, Au.D | Ontario Hearing Center, Rochester NY",
    metaDescription:
      "Andrea Segmond, Au.D is an audiologist providing extensive hearing tests, hearing aids, and other audiology services in Rochester, NY.",
    bio: `**_Andrea Segmond, Au.D, is an audiologist providing extensive hearing tests, hearing aids, and other audiology services in Rochester, NY._**

Upon graduation, I started my career at the Newark (NY) DDSO, where I worked with individuals with developmental disabilities. I conducted extensive diagnostic testing and dispensed hearing aids. I also consulted with and did evaluations for the Roosevelt Children's Center located in Newark, NY.

In 1998, I began working in a private practice and, in 2000, joined Ontario Hearing Center. This is an extraordinarily exciting time to be involved with dispensing hearing aids because of the considerable technological advances that have been made in recent years to help produce better products for people with hearing loss.

Verification measures have been enhanced to show that there is an appropriate amount of amplification and that the hearing aid performs the way it has been designed. When noise is present, we can now demonstrate that hearing aids effectively reduce surrounding noise by picking up and amplifying sound from the front (incoming speech) while suppressing other surrounding non-speech sounds. With the advent of these and other technologies, we are able to help the hearing-impaired individual now more than ever before.

Our office makes it a point of ensuring that we spend sufficient time with our patients to address their specific needs. I encourage you to make an appointment to see how we can help you with your hearing health needs.

#### Education Info

- Doctor of Audiology (Au.D.), A.T. Still University of Health Sciences, 2006
- MA Audiology, SUNY Buffalo, 1981
- BS Communicative Disorders and Sciences, SUNY Buffalo, 1978
- Member AAA, GVSLHA, NYSSLHA`,
  },
  {
    slug: "dr-elizabeth-orlando",
    name: "Dr. Elizabeth Orlando",
    role: "Audiologist",
    credentials: "Au.D.",
    photo: "/assets/dr-elizabeth-orlando.webp",
    metaTitle: "Elizabeth Orlando, Au.D | Ontario Hearing Center, Rochester NY",
    metaDescription:
      "Elizabeth Orlando, Au.D. is an audiologist providing hearing aids, hearing tests, and other audiology services in Rochester, NY.",
    bio: `**_Elizabeth Orlando, Au.D. is an audiologist providing hearing aids, hearing tests, and other audiology services in Rochester, NY._**

I joined Ontario Hearing Center in 2019. I am a native of Western New York and have served the Rochester area as an Audiologist since 1989. I completed my Doctorate of Audiology in 2005.

My career has focused on providing amplification and hearing solutions, and I am thrilled to continue to do so at the Brighton location. I have witnessed the positive impact of modern hearing aid technologies on my patients.

There are so many new technologies available to make hearing easier. Hearing aids can now connect to your phone and television. There are even ways to find your hearing aids if you lose them. I am so grateful to be working in a field that can change lives tremendously!

#### Education Info

- Doctor of Audiology (Au.D.), University of Florida, 2005
- MA Audiology, Penn State, 1986
- BS, 1984
- Fellow, American Academy of Audiology (FAAA)`,
  },
];

export const getAudiologist = (slug: string) => team.find((t) => t.slug === slug);
export const otherAudiologists = (slug: string) => team.filter((t) => t.slug !== slug);
